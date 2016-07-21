# homebridge-http-temperature

Supports https temperature devices with JSON response on HomeBridge Platform.
Its a modification of https://github.com/lucacri/homebridge-http-temperature-humidity

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g git+https://github.com/alex224/homebridge-http-temperature-humidity.git
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample file:

 ```
"accessories": [
        {
            "accessory": "HttpTemphum",
            "name": "Temperatur Keller",
            "url": "http://raspberrypi:5984/temps/_all_docs?limit=1&descending=true&include_docs=true",
            "http_method": "GET",
            "temperaturePath": "rows[0].doc.Keller",
            "temperatureMultiplier" : 0.001
        }
    ]

```


In the above example the endpoint returns a json looking like this
```
{
    total_rows: 393549,
    offset: 0,
    rows: [
        {
            id: "2016-07-21-20-00-02-315789138",
            key: "2016-07-21-20-00-02-315789138",
            value: {
                rev: "1-ae45136d99ed9234284c98871e00421b"
            },
            doc: {
                _id: "2016-07-21-20-00-02-315789138",
                _rev: "1-ae45136d99ed9234284c98871e00421b",
                time: "16-07-21 20:00:02",
                Keller: 20812,
                Studio: 24500,
                AussenSZ: 21437
            }
        }
    ]
}
```
You can handle every json response by changing the temperaturePath to a valid JSONPath expression.
A reference and examples can be found at http://goessner.net/articles/JsonPath/

This plugin acts as an interface between a web endpoint and homebridge only. You will still need some dedicated hardware to expose the web endpoints with the temperature information. In my case, I used a CouchDB.