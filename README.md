# homebridge-urtsi

Somfy URTSI plugin for [HomeBridge](https://github.com/nfarina/homebridge)

This plugin makes use of the [node-urtsi](https://github.com/yungsters/node-urtsi) package.

# Configuration

```json
{
  "platform": "Somfy URTSI",
  "channels": [
    {
      "name": "Family Room Window"
    },
    {
      "name": "Dining Room Window",
      "orientation": {
        "closed": "down",
        "middle": "stop",
        "opened": "up"
      }
    },
    {
      "name": "Master Bedroom Window",
      "orientation": {
        "closed": "stop",
        "middle": "down",
        "opened": "up"
      }
    },
    "..."
  ],
  "serialPath": "/dev/ttyUSB0"
}
```
