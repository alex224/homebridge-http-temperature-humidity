var Service, Characteristic;
var request = require('sync-request');
var JSONPath = require('JSONPath');

var temperatureService;
var humidityService;
var url
var humidity = 0;
var temperature = 0;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-httptemperaturehumidity", "HttpTemphum", HttpTemphum);
}

function HttpTemphum(log, config) {
    this.log = log;

    // url info
    this.url = config["url"];
    this.http_method = config["http_method"] || "GET";
    this.sendimmediately = config["sendimmediately"] || "";
    this.name = config["name"];
    this.manufacturer = config["manufacturer"] || "Luca Manufacturer";
    this.model = config["model"] || "Luca Model";
    this.serial = config["serial"] || "Luca Serial";
    this.temperaturePath = config["temperaturePath"];
    this.temperatureMultiplier = config["temperatureMultiplier"] || 1.0;
}

HttpTemphum.prototype = {

    httpRequest: function (url, body, method, username, password, sendimmediately, callback) {
        request({
            url: url,
            body: body,
            method: method,
            rejectUnauthorized: false
        },
            function (error, response, body) {
                callback(error, response, body)
            })
    },

    getStateHumidity: function (callback) {
        callback(null, this.humidity);
    },

    getState: function (callback) {
        var body;

        var res = request(this.http_method, this.url, {});
        if (res.statusCode > 400) {
            this.log('HTTP request failed');
            callback(error);
        } else {
            this.log('HTTP request succeeded!');

            var info = JSON.parse(res.body);
            this.log(info);

            var me = this;
            if (this.temperaturePath) {
                JSONPath({
                    json: info, path: this.temperaturePath, callback: function (value) {
                        me.log("Parse-Result: " + value);
                        var temperature =  me.temperatureMultiplier * value;
                        me.log("Format-Result: " + temperature);
                        temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                        callback(null, temperature);
                        me.temperature = temperature;
                    }
                });
            }
        }
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);

        temperatureService = new Service.TemperatureSensor(this.name);
        temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getState.bind(this));

        return [informationService, temperatureService];
    }
};
