using { sap.restaurant as my } from '../db/schema';
using from './restaurant-service-ui';

@requires: 'authenticated-user'
service RestaurantService {
    @restrict: [
        { grant: 'READ', to: ['Admin', 'Staff'] },
        { grant: '*', to: 'Admin' }
    ]
    entity Menu as projection on my.MenuItems;

    @odata.draft.enabled
    @cds.redirection.target
    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: ['READ', 'CREATE', 'UPDATE', 'pay'], to: 'Staff' }
    ]
    entity Orders as projection on my.Orders actions {
        action pay(paymentMethod : String enum { Cash; Card; UPI }) returns Orders;
    };

    @restrict: [
        { grant: '*', to: 'Admin' },
        { grant: ['READ', 'CREATE', 'UPDATE'], to: 'Staff' }
    ]
    entity OrderItems as projection on my.OrderItems;

    @restrict: [
        { grant: '*', to: 'Admin' }
    ]
    entity Users as projection on my.Users;

    action login(email : String, password : String, role : String) returns {
        success : Boolean;
        role    : String;
        email   : String;
        name    : String;
        message : String;
    };

    function userInfo() returns {
        id     : String;
        email  : String;
        name   : String;
        roles  : array of String;
        scopes : array of String;
    };

    @restrict: [
        { grant: '*', to: 'Admin' }
    ]
    function getBtpUsers() returns array of {
        id     : String;
        email  : String;
        name   : String;
        role   : String;
        isRoot : Boolean;
    };

    @restrict: [
        { grant: '*', to: 'Admin' }
    ]
    action assignBtpRole(email : String, role : String, name : String) returns {
        success : Boolean;
        message : String;
        email   : String;
        role    : String;
    };

    @restrict: [
        { grant: '*', to: 'Admin' }
    ]
    action removeBtpUser(email : String) returns {
        success : Boolean;
        message : String;
        email   : String;
    };

    @readonly
    @restrict: [
        { grant: 'READ', to: 'Admin' }
    ]
    entity TotalSales {
        key date          : Date;
        totalRevenue      : Decimal(12, 2);
        currency          : String(3) default 'INR';
        paidBillsCount    : Integer;
        totalOrdersCount  : Integer;
        unpaidRevenue     : Decimal(12, 2);
    }

    @readonly
    @cds.redirection.target: false
    @restrict: [
        { grant: 'READ', to: ['Admin', 'Staff'] }
    ]
    entity ActiveOrders as projection on my.ActiveOrders;

    @readonly
    @restrict: [
        { grant: 'READ', to: 'Admin' }
    ]
    entity CategorySales as projection on my.CategorySales;

    @readonly
    entity OrderStatuses {
        key code : String;
        name     : String;
    }

    @readonly
    entity PaymentStatuses {
        key code : String;
        name     : String;
    }

    @readonly
    entity PaymentMethods {
        key code : String;
        name     : String;
    }
}
