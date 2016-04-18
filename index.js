'use strict';

const URTSI = require('urtsi');

module.exports = homebridge => {
  const Accessory = homebridge.platformAccessory;
  const Characteristic = homebridge.hap.Characteristic;
  const Service = homebridge.hap.Service;
  const UUIDGen = homebridge.hap.uuid;

  /**
   * Platform "Somfy URTSI"
   */

  class URTSIPlatform {
    constructor(log, config) {
      this.log = log;
      const channelNames = config.channels;
      if (!Array.isArray(channelNames)) {
        this.log('Bad `config.channels` value, must be an array.');
        this.channelNames = [];
      } else {
        this.channelNames = channelNames;
      }
      this.urtsi = new URTSI(config.serialPath);
    }

    accessories(callback) {
      const accessories = this.channelNames.map((channelName, index) => {
        if (channelName === null) {
          return null;
        }
        if (typeof channelName !== 'string') {
          this.log(`Bad channel at index ${index}, must be a string or null.`);
          return null;
        }
        return new URTSIChannelAccessory(this, channelName, index + 1);
      });
      callback(accessories.filter(accessory => accessory !== null));
    }
  }

  /**
   * Accessory "Somfy URTSI Channel"
   */

  class URTSIChannelAccessory extends Accessory {
    constructor(platform, channelName, channelNumber) {
      const displayName = `Somfy ${channelName}`;
      const uuid = UUIDGen.generate(`urtsi.channel.${channelNumber}`);
      super(displayName, uuid);

      // Homebridge reqiures these.
      this.name = displayName;
      this.uuid_base = uuid;

      this.log = platform.log;
      this.urtsi = platform.urtsi;

      this.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'Somfy')
        .setCharacteristic(Characteristic.Model, 'Universal RTS Interface II');

      this.addService(
        this.createWindowCoveringService(channelName, channelNumber)
      );
    }

    createWindowCoveringService(channelName, channelNumber) {
      const service = new Service.WindowCovering(channelName);

      const currentPosition =
        service.getCharacteristic(Characteristic.CurrentPosition);
      const positionState =
        service.getCharacteristic(Characteristic.PositionState);
      const targetPosition =
        service.getCharacteristic(Characteristic.TargetPosition);

      targetPosition.on('set', (targetValue, callback) => {
        const logError = error => {
          this.log(
            'Encountered an error setting target position of %s: %s',
            `channel ${channelNumber} (${channelName})`,
            error.message
          );
        };

        currentPosition.getValue((error, currentValue) => {
          if (error) {
            logError(error);
            callback(error);
            return;
          }

          this.log(
            'Setting target position of %s from %s to %s.',
            `channel ${channelNumber} (${channelName})`,
            `${currentValue}%`,
            `${targetValue}%`
          );
          positionState.setValue(
            targetValue < currentValue
              ? Characteristic.PositionState.DECREASING
              : targetValue > currentValue
                ? Characteristic.PositionState.INCREASING
                : Characteristic.PositionState.STOPPED
          );
          callback();


          const channel = this.urtsi.getChannel(channelNumber);
          const promise =
            targetValue === 0
              ? channel.down()
              : targetValue === 100
                ? channel.up()
                : channel.stop();

          promise.then(
            () => {
              currentPosition.setValue(targetValue);
              positionState.setValue(Characteristic.PositionState.STOPPED);
            },
            logError
          );
        });
      });

      // Set a more sane default value for the current position.
      currentPosition.setValue(currentPosition.getDefaultValue());

      return service;
    }

    getServices() {
      return this.services;
    }
  }

  homebridge.registerPlatform('homebridge-urtsi', 'Somfy URTSI', URTSIPlatform);
};
