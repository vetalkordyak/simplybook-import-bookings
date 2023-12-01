
var Import = function() {
    this.init();
}

jQuery.extend(Import.prototype, {

    apiUrl: 'https://user-api-v2.simplybook.me/',

    fields: [
        'client_name',
        'date',
        'time',
        'datetime',
        'client_phone',
        'client_email',
        'service_name',
        'provider_name',
    ],

    requiredFields : [
        'client_name',
        'date',
        'time',
        'datetime',
        'service_name',
        'provider_name',
    ],
    
    usedFields : {

    },

    loginData: null,
    data: null,
    _cache: {},

    init: function() {
        this.initDom();
        this.initEvents();
    },

    initDom: function() {
        if(localStorage.getItem('loginData')){
            this.loginData = JSON.parse(localStorage.getItem('loginData'));
            this.showStep(2);
            this._refreshToken();
        }
    },

    initEvents: function() {
        console.log('initEvents');
        var _this = this;

        jQuery('#sign-in').on('click', function(e) {
            var $form = jQuery('#form-signin');
            var dataArr = $form.serializeArray();

            //convert to object
            var data = {};
            for (var i = 0; i < dataArr.length; i++) {
                data[dataArr[i].name] = dataArr[i].value;
            }

            console.log(data);
            _this._signApi(data.company, data.login, data.password);
            e.preventDefault();
            return false;
        });

        jQuery('#csvFile').on('change', function(e) {
            var file = e.target.files[0];
            if(file){
                _this._parseCSVFile(file, function(objects){
                    console.log(objects);
                    if(objects.length > 0){
                        _this.data = objects;
                        _this.showStep(3);
                    } else {
                        _this._showError('Error: no data in file or wrong format');
                    }
                });
            }
        });
    },

    _parseCSVFile : function(file, handler){
        var _this = this;

        var reader = new FileReader();

        reader.onload = function(e) {
            var contents = e.target.result;
            var lines = contents.split('\n');
            var keys = lines[0].split(',');
            var objects = [];

            for (var i = 0; i < lines.length; i++) {
                var values = lines[i].split(',');
                var obj = {};

                if(values.length !== keys.length){
                    continue;
                }
                for (var j = 0; j < keys.length; j++) {
                    obj[j] = values[j];
                }
                objects.push(obj);
            }

            handler(objects);
        };
        //add error handler

        reader.readAsText(file);
    },

    _drawTable : function(){
        var _this = this;
        var isRequiredFieldsFilled = function (){
            //if date and time used - ignore datetime
            var isDateUsed = Object.values(_this.usedFields).indexOf('date') > -1;
            var isTimeUsed = Object.values(_this.usedFields).indexOf('time') > -1;
            var isDateTimeUsed = Object.values(_this.usedFields).indexOf('datetime') > -1;
            var isDateSelected = (isDateUsed && isTimeUsed) || isDateTimeUsed;

            if(!isDateSelected){
                return false;
            }
            var isRequiredFieldsFilled = true;
            for (var i = 0; i < _this.requiredFields.length; i++) {
                var name = _this.requiredFields[i];
                if(['date', 'time', 'datetime'].indexOf(name) > -1 && isDateSelected){
                    continue;
                }
                if(Object.values(_this.usedFields).indexOf(name) === -1){
                    isRequiredFieldsFilled = false;
                    break;
                }
            }
            return isRequiredFieldsFilled;
        }


        var $table = jQuery('#tableData');
        var $thead = $table.find('thead');
        var $tbody = $table.find('tbody');

        //clear
        $thead.html('');
        $tbody.html('');

        //draw header
        var columnsCount = Object.keys(this.data[0]).length;
        var $tr = jQuery('<tr></tr>');
        
        for (var i = 0; i < columnsCount; i++) {
            var $th = jQuery('<th></th>');
            //append select
            var $select = jQuery('<select class="form-control"></select>');
            $select.append('<option value="">--</option>');
            for (var j = 0; j < this.fields.length; j++) {
                var name = this.fields[j];
                var isUsed = Object.values(this.usedFields).indexOf(name) > -1 && this.usedFields[i] !== name;
                var isSelected = this.usedFields[i] === name;
                var isRequired = this.requiredFields.indexOf(name) > -1;

                if(!isUsed){
                    $select.append('<option value="'+name+'"' + (isSelected?' selected':'') + '>'+name+ (isRequired?'*':'') +'</option>');
                }
            }
            $th.append($select);
            //append input
            $tr.append($th);
        }

        $thead.append($tr);

        //draw body (first 4 rows)
        var rowsCount = this.data.length > 4 ? 4 : this.data.length;
        for (var i = 0; i < rowsCount; i++) {
            var $tr = jQuery('<tr></tr>');
            for (var j = 0; j < columnsCount; j++) {
                var $td = jQuery('<td></td>');
                $td.text(this.data[i][j]);
                $tr.append($td);
            }
            $tbody.append($tr);
        }

        //draw footer

        var $tr = jQuery('<tr></tr>');
        var $td = jQuery('<td colspan="'+columnsCount+'"></td>');
        var isAllowImport = isRequiredFieldsFilled();
        var $button = jQuery('<button class="btn btn-primary" ' + (isAllowImport?'':'disabled') + ' id="import-btn">Import</button>');
        $td.append($button);
        $tr.append($td);
        $tbody.append($tr);

        //add events

        $thead.find('select').on('change', function(e){
            var $select = jQuery(this);
            var name = $select.val();
            var index = $select.parent().index();

            if(name.length > 0){
                _this.usedFields[index] = name;
            } else {
                delete _this.usedFields[index];
            }

            _this._drawTable();
        });

        $button.on('click', function(e){
            if(isRequiredFieldsFilled()) {
                _this._importData();
            } else {
                _this._showError('Please select all required fields');
            }
        });
    },


    _importData : function(){
        var _this = this;
        var data = [];
        var usedFields = this.usedFields;

        //replace ids with names
        for (var i = 0; i < this.data.length; i++) {
            var obj = {};
            for (var j = 0; j < Object.keys(this.data[i]).length; j++) {
                var name = usedFields[j];
                if(name){
                    obj[name] = this.data[i][j];
                }
            }
            data.push(obj);
        }

        for (var i = 0; i < data.length; i++) {
            obj = data[i];
            if(obj.datetime){
                obj.datetime = moment(obj.datetime).format('YYYY-MM-DD HH:mm:ss');
            }
            if(obj.date){
                //add time and convert to datetime
                obj.datetime = moment(obj.date + ' ' + obj.time).format('YYYY-MM-DD HH:mm:ss');
                delete obj.date;
                delete obj.time;
            }
        }


        this._getServices(function(servicesMap){
            _this._getProviders(function(providersMap){
                //replace service and provider names with ids

                var notFoundServices = [];
                var notFoundProviders = [];

                if(!servicesMap || Object.keys(servicesMap).length == 0){
                    _this._showError('Error: no services found');
                    return;
                }

                if(!providersMap || Object.keys(providersMap).length == 0){
                    _this._showError('Error: no providers found');
                    return;
                }

                for (var i = 0; i < data.length; i++) {
                    var obj = data[i];
                    if(Object.values(servicesMap).indexOf(String(obj.service_name).trim().toLowerCase()) > -1){
                        obj.service_id = Object.keys(servicesMap)[Object.values(servicesMap).indexOf(String(obj.service_name).trim().toLowerCase())];
                    } else {
                        obj.service_id = Object.keys(servicesMap)[0];
                        if(notFoundServices.indexOf(obj.service_name) === -1){
                            notFoundServices.push(obj.service_name);
                        }
                    }
                    if(Object.values(providersMap).indexOf(String(obj.provider_name).trim().toLowerCase()) > -1){
                        obj.provider_id = Object.keys(providersMap)[Object.values(providersMap).indexOf(String(obj.provider_name).trim().toLowerCase())];
                    } else {
                        obj.provider_id = Object.keys(providersMap)[0];
                        if(notFoundProviders.indexOf(obj.provider_name) === -1){
                            notFoundProviders.push(obj.provider_name);
                        }
                    }
                }

                if(notFoundServices.length > 0 || notFoundProviders.length > 0){
                    //prompt to create services and providers
                    var msg = '';
                    if(notFoundServices.length > 0){
                        msg += 'Services with names not found: ' + notFoundServices.join(', ') + '\n';
                    }
                    if(notFoundProviders.length > 0){
                        msg += 'Providers with names not found: ' + notFoundProviders.join(', ') + '\n';
                    }
                    msg += 'We recommend to create them manually before import. If ignore - all appointments will be assigned to first service and provider. Continue?';
                    if(!confirm(msg)){
                        return;
                    }
                }

                window.data = data;
                console.log(data);

                _this.showStep(4);

                //import

                var count = 0;
                var total = data.length;
                var errors = [];
                var success = [];
                var percent = 0;
                var $progress = jQuery('#progressbar');
                var $logTextarea = jQuery('#log');

                var importNext = function(i, handler){
                    if(i >= data.length){
                        handler(null);
                        return;
                    }
                    var obj = data[i];

                    $logTextarea.val($logTextarea.val() + '\n\nImporting ' + (i+1) + ' of ' + data.length + '... ' + obj.client_name + ' ' + obj.datetime + '\n');

                    _this._searchClient(obj.client_name, obj.client_email, obj.client_phone, function(client){
                        if(client){
                            $logTextarea.val($logTextarea.val() + 'Client found: ' + client.name + ' ' + client.email + ' ' + client.phone + '\n');
                            obj.client_id = client.id;
                            _this._makeBooking(obj, function(res){
                                if(res.bookings && res.bookings.length > 0){
                                    $logTextarea.val($logTextarea.val() + 'Booking created: ' + res.bookings[0].code + '\n');
                                    success.push(obj);
                                } else {
                                    $logTextarea.val($logTextarea.val() + 'Error: booking not created\n' + JSON.stringify(res) + '\n');
                                    errors.push({
                                        obj: obj,
                                        error: 'Error: booking not created'
                                    });
                                }
                                count++;
                                handler(i, res);
                            });
                        } else {
                            $logTextarea.val($logTextarea.val() + 'Client not found. Creating new client...\n');
                            _this._createClient(obj.client_name, obj.client_email, obj.client_phone, function(client){
                                if(client){
                                    $logTextarea.val($logTextarea.val() + 'Client created: ' + client.name + ' ' + client.email + ' ' + client.phone + '\n');
                                    obj.client_id = client.id;
                                    _this._makeBooking(obj, function(res){
                                        if(res.bookings && res.bookings.length > 0){
                                            $logTextarea.val($logTextarea.val() + 'Booking created: ' + res.bookings[0].code + '\n');
                                            success.push(obj);
                                        } else {
                                            $logTextarea.val($logTextarea.val() + 'Error: booking not created\n' + JSON.stringify(res) + '\n');
                                            errors.push({
                                                obj: obj,
                                                error: 'Error: booking not created'
                                            });
                                        }
                                        count++;
                                        handler(i, res);
                                    });
                                } else {
                                    $logTextarea.val($logTextarea.val() + 'Error: client not found and not created\n');
                                    errors.push({
                                        obj: obj,
                                        error: 'Error: client not found and not created'
                                    });
                                    count++;
                                    handler(i, null);
                                }
                            });
                        }
                    });
                }


                importNext(0, function(i, res){
                    percent = Math.round(count / total * 100);
                    $progress.text(percent + '%');
                    $progress.css('width', percent + '%');
                    if(i === data.length - 1){
                        //finish
                        console.log('finish');
                        console.log(errors);
                        console.log(success);
                        $logTextarea.val($logTextarea.val() + '\n\nImport finished. ' + success.length + ' of ' + data.length + ' imported successfully.\n');
                    }

                    var callback = arguments.callee;

                    setTimeout(function() {
                        if(i < data.length - 1){
                            importNext(i+1, callback);
                        }
                    }, 1000);

                });
            });
        });
    },

    _createSearch : function (name, email, phone){
        if(!name && !email && !phone){
            this._showError('Error: no name, email or phone');
            return '';
        }
        var search = '';
        if(email){
            search += email;
            return search;
        }

        if(phone){
            search += phone;
            return search;
        }
        return name;
    },

    // GET https://user-api-v2.simplybook.me/admin/clients?page=1&on_page=10&filter[search]=al
    // Content-Type: application/json
    // X-Company-Login: <insert your company login>
    // X-Token: <insert your token from auth step>

    _searchClient : function (name, email, phone, handler){
        var _this = this;
        var search = this._createSearch(name, email, phone);

        var data = {
            'filter[search]': search
        };

        if(this._cache['client_' + search]){
            handler(this._cache['client_' + search]);
            return;
        }

        jQuery.ajax({
            url: this.apiUrl + 'admin/clients',
            type: 'GET',
            dataType: 'json',
            data: data,
            headers: {
                'X-Company-Login': this.loginData.company,
                'X-Token': this.loginData.token
            },
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
               if(data && data.data && data.data.length > 0){
                   _this._cache['client_' + search] = data.data[0];
                   handler(data.data[0]);
               } else {
                   handler(null);
               }
            },
            error: function (data) {
                _this._apiError(data);
            }
        });
    },

    // POST https://user-api-v2.simplybook.me/admin/clients
    // Content-Type: application/json
    // X-Company-Login: <insert your company login>
    // X-Token: <insert your token from auth step>
    //
    // {
    //     "name": "Mike",
    //     "email": "mikeemail@gmail.com",
    //     "phone": "+123456789987"
    // }
    _createClient : function (name, email, phone, handler){
        var _this = this;
        var data = {
            name: name,
            email: email,
            phone: phone
        };

        var search = this._createSearch(name, email, phone);

        jQuery.ajax({
            url: this.apiUrl + 'admin/clients',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(data),
            headers: {
                'X-Company-Login': this.loginData.company,
                'X-Token': this.loginData.token
            },
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                _this._cache['client_' + search] = data;
                handler(data);
            },
            error: function (data) {
                _this._apiError(data);
            }
        });
    },

    // POST https://user-api-v2.simplybook.me/admin/bookings
    // Content-Type: application/json
    // X-Company-Login: <insert your company login>
    // X-Token: <insert your token from auth step>
    //
    // {
    //     "count": 1,
    //     "start_datetime": "2020-12-02 09:30:00",
    //     "location_id": 2,
    //     "category_id": 2,
    //     "provider_id": 4,
    //     "service_id": 3,
    //     "client_id": 10,
    // }
    _makeBooking: function(data, handler){
        var _this = this;

        if(data.datetime){
            data.start_datetime = data.datetime;
            delete data.datetime;
        }

        if(!data.count){
            data.count = 1;
        }

        jQuery.ajax({
            url: this.apiUrl + 'admin/bookings',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(data),
            headers: {
                'X-Company-Login': this.loginData.company,
                'X-Token': this.loginData.token
            },
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                handler(data);
            },
            error: function (data) {
                handler(data);
            }
        });
    },

    // GET https://user-api-v2.simplybook.me/admin/services?filter[search]=massage
    // Content-Type: application/json
    // X-Company-Login: <insert your company login>
    // X-Token: <insert your token from auth step>
    _getServices : function (handler){
        var _this = this;
        var data = {
           // 'filter[search]': 'massage'
        };

        jQuery.ajax({
            url: this.apiUrl + 'admin/services',
            type: 'GET',
            dataType: 'json',
            data: data,
            headers: {
                'X-Company-Login': this.loginData.company,
                'X-Token': this.loginData.token
            },
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                //create id => name map
                var map = {};
                for (var i = 0; i < data['data'].length; i++) {
                    map[data['data'][i].id] = String(data['data'][i].name).trim().toLowerCase();
                }
                handler(map);
            },
            error: function (data) {
                _this._signApiError(data);
            }
        });
    },

    _getProviders : function (handler){
        var _this = this;
        var data = {
            //'filter[search]': 'massage'
        };

        jQuery.ajax({
            url: this.apiUrl + 'admin/providers',
            type: 'GET',
            dataType: 'json',
            data: data,
            headers: {
                'X-Company-Login': this.loginData.company,
                'X-Token': this.loginData.token
            },
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                //create id => name map
                var map = {};
                for (var i = 0; i < data['data'].length; i++) {
                    map[data['data'][i].id] = String(data['data'][i].name).trim().toLowerCase();
                }
                handler(map);
            },
            error: function (data) {
                _this._signApiError(data);
            }
        });
    },

    // POST https://user-api-v2.simplybook.me/admin/auth
    // Content-Type: application/json
    //
    // {
    //     "company": "<insert your company login>",
    //     "login": "<insert your user login>",
    //     "password": "<insert your user password>"
    // }
    _signApi : function (company, login, password){
        var _this = this;
        var data = {
            company: company,
            login: login,
            password: password
        };

        jQuery.ajax({
            url: this.apiUrl + 'admin/auth',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                _this._signApiSuccess(data);
            },
            error: function (data) {
                _this._signApiError(data);
            }
        });
    },

    //POST https://user-api-v2.simplybook.me/admin/auth/refresh-token
    // Content-Type: application/json
    //
    // {
    //   "company": "<insert your company login>",
    //   "refresh_token": "<insert refresh_token from auth step>"
    // }
    _refreshToken : function (){
        var _this = this;
        var data = {
            company: this.loginData.company,
            refresh_token: this.loginData.refresh_token
        };

        jQuery.ajax({
            url: this.apiUrl + 'admin/auth/refresh-token',
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: 'application/json; charset=utf-8',
            success: function (data) {
                _this._signApiSuccess(data);
            },
            error: function (data) {
                _this._signApiError(data);
            }
        });
    },

    _signApiSuccess : function(data){
        if(data.token && data.token.length > 0 && data.refresh_token && data.refresh_token.length > 0){
            console.log('token: ' + data.token);
            //save to local storage
            localStorage.setItem('loginData', JSON.stringify(data));
            this.loginData = data;
            this.showStep(2);
        } else {
            this._showError('Error: no token. Please disable 2fa in your account and try again.');
        }
    },

    _apiError : function(data){
        console.log(data);
        var msg = 'Error';
        if(data.error){
            msg = data.error;
        }
        if(data.message){
            msg = data.message;
        }
        if(data.responseJSON && data.responseJSON.message){
            msg = data.responseJSON.message;
        }
        this._showError(msg);
    },

    _signApiError : function(data) {
        console.log(data);
        var msg = 'Error';
        if(data.error){
            msg = data.error;
        }
        if(data.message){
            msg = data.message;
        }
        if(data.responseJSON && data.responseJSON.message){
            msg = data.responseJSON.message;
        }
        this.showStep(1);
        this._showError(msg);
    },

    _showError : function(msg){
        //if array - implode
        if(msg instanceof Array){
            msg = msg.join('<br>');
        }
        alert(msg);
    },

    showStep: function(step) {
        this.hideSteps();
        jQuery('.step-' + step).removeClass('hidden');
        if(step == 3){
            this._drawTable();
        }
    },

    hideSteps: function() {
        jQuery('.step').addClass('hidden');
    },
});


jQuery(document).ready(function() {

    new Import();
});