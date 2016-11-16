var Service, Characteristic;
var request = require('sync-request');
var JSONPath = require('JSONPath');

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
    this.cacheExpirationMillis = 1000 * (config["cacheExpirationSeconds"] || 120);
    
    var temperatureCache = GLOBAL.temperatureCache;
    if (!temperatureCache) {
        temperatureCache = {};
        GLOBAL.temperatureCache = temperatureCache;
    }

    this.myTempCache = temperatureCache[this.url];

    var me = this;
    if (!this.myTempCache) {
        this.isMaster = true;
        this.myTempCache = { lastFetchTime: null, lastFetchResult : 0, listeners : [] };
        temperatureCache[this.url] = this.myTempCache;
        this.log("is master for " + this.url);

        //master loads automatically temperatures every 2 minutes
        setInterval(function() {
            me.getJSON(function(error, json) {
                if (error) {
                    me.log("error loading temps " + error);
                    //ignore
                } else {
                    var cache = me.myTempCache;
                    cache.lastFetchResult = json;
                    cache.lastFetchTime = new Date().getTime();

                    //update homekit automatically
                    me.getTemperatureFromJson(json, function(temperature) {
                        me.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                    });

                    //update alle other slaves
                    this.myTempCache.listeners.forEach(function(listener) {
                        listener(json);
                    });
                }
            });
        }, this.cacheExpirationMillis);

    } else {
        this.log("is not the master for " + this.url);
        this.isMaster = false;
        this.myTempCache.listeners.push(function(json) {
            me.getTemperatureFromJson(json, function(temperature) {
                me.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
            });
        });
    }
}

HttpTemphum.prototype = {

    getStateCached: function (callback) {
        var me = this;
        var cache = this.myTempCache;
        
        var cacheIsGood = cache.lastFetchResult && (new Date().getTime() - cache.lastFetchTime < me.cacheExpirationMillis);
        if (cacheIsGood) {
            this.log("Using cached result: " +  cache.lastFetchResult);
            me.getTemperatureFromJson(cache.lastFetchResult, function(temperature) {
                //temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                callback(null, temperature);
            });
        } else {
            this.log("Cache expired. Fetching new data... ");
            this.getJSON(function(error, json) {
                if (error) {
                    callback(error);
                } else {
                    cache.lastFetchResult = json;
                    cache.lastFetchTime = new Date().getTime();

                    me.getTemperatureFromJson(json, function(temperature) {
                        //temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                        callback(null, temperature);
                    });
                }
            });
        }
    },

    getTemperatureFromJson: function (json, callback) {
        var me = this;
        if (this.temperaturePath) {
            JSONPath({
                json: json, path: this.temperaturePath, callback: function (value) {
                    var temperature =  me.temperatureMultiplier * parseFloat(value);
                    me.log("Parse-Result: " + value + " - Format-Result: " + temperature);
                    callback(temperature);
                }
            });
        }
    },

    getJSON: function(callback) {
        try {
            var res = request(this.http_method, this.url, {});

            if (res.statusCode > 400) {
                this.log('HTTP request failed');
                callback(error);
            } else {
                this.log('HTTP request succeeded!!');
                var info = JSON.parse(res.body);
                //this.log(info);
                callback(null, info);
            }
        } catch (e) {
            this.log('ERROR: ' + e);
            callback(e, null);
        }
    },

    getState: function (callback) {
        var me = this;
        this.getJSON(function(error, json) {
            if (error) {
                callback(error);
            } else {
                me.getTemperatureFromJson(json, function(temperature) {
                    me.temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                    callback(null, temperature);
                });
            }
        });
    },

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        var me = this;
        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);

        me.temperatureService = new Service.TemperatureSensor(this.name);
        me.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getStateCached.bind(this));

        return [informationService, me.temperatureService];
    }
};
