import cds from '@sap/cds';

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const LOG = cds.log('btp-security');

// Fallback credentials from service key if not in VCAP_SERVICES
const DEFAULT_CREDS = {
  url: 'https://062d3605trial.authentication.us10.hana.ondemand.com',
  apiurl: 'https://api.authentication.us10.hana.ondemand.com',
  clientid: 'sb-na-3d5082dd-4c06-4748-a79a-8b2b7a91da57!a735644',
  clientsecret: '1d72c881-ba55-40d3-92f9-5bd384d3ec7c$OVT_i_qZTBTE54CJ97f1KwDWYWniVo9MtwU7-mSojCQ='
};

let cachedToken = null;
let tokenExpiry = 0;

function getCredentials() {
  if (process.env.VCAP_SERVICES) {
    try {
      const vcap = JSON.parse(process.env.VCAP_SERVICES);
      if (vcap.xsuaa) {
        const apiInstance = vcap.xsuaa.find(
          s => s.name === 'restaurant-xsuaa-api' || s.plan === 'apiaccess'
        );
        if (apiInstance && apiInstance.credentials) {
          return {
            url: apiInstance.credentials.url,
            apiurl: apiInstance.credentials.apiurl || 'https://api.authentication.us10.hana.ondemand.com',
            clientid: apiInstance.credentials.clientid,
            clientsecret: apiInstance.credentials.clientsecret
          };
        }
      }
    } catch (e) {
      LOG.warn('Could not parse VCAP_SERVICES for xsuaa-api:', e.message);
    }
  }
  return DEFAULT_CREDS;
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 60000) {
    return cachedToken;
  }

  const creds = getCredentials();
  const tokenUrl = `${creds.url}/oauth/token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientid,
      client_secret: creds.clientsecret
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain BTP OAuth token: HTTP ${res.status} - ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * Fetch group details for a given group ID (Role Collection name in BTP)
 */
async function getGroup(groupId) {
  const creds = getCredentials();
  const token = await getAccessToken();
  const res = await fetch(`${creds.apiurl}/Groups/${encodeURIComponent(groupId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to get group ${groupId}: HTTP ${res.status} - ${await res.text()}`);
  }
  return await res.json();
}

/**
 * Update group members in SAP BTP
 */
async function updateGroup(group) {
  const creds = getCredentials();
  const token = await getAccessToken();
  const res = await fetch(`${creds.apiurl}/Groups/${encodeURIComponent(group.id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'If-Match': '*'
    },
    body: JSON.stringify(group)
  });

  if (!res.ok) {
    throw new Error(`Failed to update group ${group.id}: HTTP ${res.status} - ${await res.text()}`);
  }
  return await res.json();
}

/**
 * List all users in BTP SCIM
 */
async function listScimUsers() {
  const creds = getCredentials();
  const token = await getAccessToken();
  const res = await fetch(`${creds.apiurl}/Users`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`Failed to list BTP users: HTTP ${res.status} - ${await res.text()}`);
  }
  const data = await res.json();
  return data.resources || [];
}

/**
 * Find or create a user in SAP BTP SCIM by email/username
 */
async function findOrCreateUser(email, displayName) {
  const cleanEmail = email.toLowerCase().trim();
  const creds = getCredentials();
  const token = await getAccessToken();

  // 1. Search existing users
  const searchRes = await fetch(
    `${creds.apiurl}/Users?filter=${encodeURIComponent(`userName eq "${cleanEmail}"`)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.resources && data.resources.length > 0) {
      return data.resources[0];
    }
  }

  // 2. If not found, create shadow user in BTP
  const nameParts = (displayName || cleanEmail.split('@')[0]).split(' ');
  const givenName = nameParts[0] || 'User';
  const familyName = nameParts.slice(1).join(' ') || givenName;

  const createRes = await fetch(`${creds.apiurl}/Users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userName: cleanEmail,
      emails: [{ value: cleanEmail, primary: true }],
      name: {
        givenName,
        familyName
      },
      origin: 'sap.default'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create BTP shadow user for ${cleanEmail}: HTTP ${createRes.status} - ${errText}`);
  }

  return await createRes.json();
}

/**
 * Get all users and their assigned BTP role collections ('Admin' | 'Staff' | 'None')
 */
export async function getBtpUsersWithRoles() {
  const [adminGroup, staffGroup, scimUsers] = await Promise.all([
    getGroup('Restaurant_Admin'),
    getGroup('Restaurant_Staff'),
    listScimUsers()
  ]);

  const adminMemberIds = new Set((adminGroup?.members || []).map(m => m.value));
  const staffMemberIds = new Set((staffGroup?.members || []).map(m => m.value));

  const result = [];
  const processedEmails = new Set();

  // Add BTP SCIM users
  for (const u of scimUsers) {
    const email = (u.userName || (u.emails && u.emails[0]?.value) || '').toLowerCase().trim();
    if (!email) continue;
    processedEmails.add(email);

    let role = 'None';
    if (adminMemberIds.has(u.id)) {
      role = 'Admin';
    } else if (staffMemberIds.has(u.id)) {
      role = 'Staff';
    }

    const givenName = u.name?.givenName || '';
    const familyName = u.name?.familyName || '';
    const name = (givenName || familyName) ? `${givenName} ${familyName}`.trim() : email.split('@')[0];

    result.push({
      id: u.id,
      email,
      name,
      role,
      isRoot: email === 'kirtandesai07@gmail.com'
    });
  }

  // Ensure root admin is always present and marked Admin
  if (!processedEmails.has('kirtandesai07@gmail.com')) {
    result.unshift({
      id: 'root-kirtan-admin',
      email: 'kirtandesai07@gmail.com',
      name: 'Kirtan Desai',
      role: 'Admin',
      isRoot: true
    });
  }

  return result;
}

/**
 * Assign or change a role collection in BTP ('Admin', 'Staff', or 'None')
 */
export async function setBtpUserRole(email, targetRole, displayName) {
  const cleanEmail = email.toLowerCase().trim();
  const normalizedRole = targetRole ? targetRole.trim() : 'Staff'; // 'Admin', 'Staff', 'None'

  if (cleanEmail === 'kirtandesai07@gmail.com' && normalizedRole !== 'Admin') {
    throw new Error('Root Administrator (kirtandesai07@gmail.com) is permanently protected and must remain Admin.');
  }

  const user = await findOrCreateUser(cleanEmail, displayName);
  const userId = user.id;

  const [adminGroup, staffGroup] = await Promise.all([
    getGroup('Restaurant_Admin'),
    getGroup('Restaurant_Staff')
  ]);

  if (!adminGroup || !staffGroup) {
    throw new Error('Required BTP Role Collections (Restaurant_Admin / Restaurant_Staff) not found.');
  }

  // Remove from both first
  adminGroup.members = (adminGroup.members || []).filter(m => m.value !== userId);
  staffGroup.members = (staffGroup.members || []).filter(m => m.value !== userId);

  // Add to target group
  if (normalizedRole.toLowerCase() === 'admin') {
    adminGroup.members.push({
      origin: user.origin || 'sap.default',
      type: 'USER',
      value: userId
    });
  } else if (normalizedRole.toLowerCase() === 'staff') {
    staffGroup.members.push({
      origin: user.origin || 'sap.default',
      type: 'USER',
      value: userId
    });
  }

  // Save changes to BTP
  await Promise.all([
    updateGroup(adminGroup),
    updateGroup(staffGroup)
  ]);

  LOG.info(`Successfully updated BTP role collection for ${cleanEmail} -> ${normalizedRole}`);
  return { success: true, email: cleanEmail, role: normalizedRole };
}

/**
 * Remove a user completely from BTP restaurant role collections
 */
export async function removeBtpUserRoles(email) {
  const cleanEmail = email.toLowerCase().trim();

  if (cleanEmail === 'kirtandesai07@gmail.com') {
    throw new Error('Root Administrator (kirtandesai07@gmail.com) cannot be removed.');
  }

  const [adminGroup, staffGroup, scimUsers] = await Promise.all([
    getGroup('Restaurant_Admin'),
    getGroup('Restaurant_Staff'),
    listScimUsers()
  ]);

  const scimUser = scimUsers.find(
    u => u.userName?.toLowerCase() === cleanEmail || (u.emails && u.emails[0]?.value?.toLowerCase() === cleanEmail)
  );

  if (scimUser && adminGroup && staffGroup) {
    adminGroup.members = (adminGroup.members || []).filter(m => m.value !== scimUser.id);
    staffGroup.members = (staffGroup.members || []).filter(m => m.value !== scimUser.id);

    await Promise.all([
      updateGroup(adminGroup),
      updateGroup(staffGroup)
    ]);
  }

  LOG.info(`Successfully revoked all BTP restaurant roles for ${cleanEmail}`);
  return { success: true, email: cleanEmail };
}
