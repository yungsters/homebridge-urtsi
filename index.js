'use strict';

module.exports = homebridge => {
  // const Accessory = homebridge.platformAccessory;
  // const Characteristic = homebridge.hap.Characteristic;
  const Service = homebridge.hap.Service;
  // const UUIDGen = homebridge.hap.uuid;

  class URTSIPlatform {
    constructor(log, config) {
      const channelNames = config.channels;
      if (!Array.isArray(channelNames)) {
        log('Invalid `config.channels` value, must be an array.');
      }
      this.channelServices = channelNames.map((channelName, index) => {
        if (channelName === null) {
          return null;
        }
        if (typeof channelName !== 'string') {
          log(`Invalid channel at index ${index}, must be a string or null.`);
          return null;
        }
        return new Service.WindowCovering(channelName);
      });
    }

    getServices() {
      return this.channelServices.filter(
        channelService => channelService !== null
      );
    }
  }

  homebridge.registerPlatform('homebridge-urtsi', 'Somfy URTSI', URTSIPlatform);
};
