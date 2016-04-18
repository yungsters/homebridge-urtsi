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
      const channelConfigs = config.channels;
      if (!Array.isArray(channelConfigs)) {
        this.log('Bad `config.channels` value, must be an array.');
        this.channelConfigs = [];
      } else {
        this.channelConfigs = channelConfigs;
      }
      this.urtsi = new URTSI(config.serialPath);
    }

    accessories(callback) {
      const accessories = this.channelConfigs.map((channelConfig, index) => {
        if (channelConfig === null) {
          return null;
        }
        if (typeof channelConfig !== 'object') {
          this.log(`Bad channel at index ${index}, must be an object or null.`);
          return null;
        }
        const name = channelConfig.name;
        if (typeof name !== 'string') {
          this.log(`Bad channel name at index ${index}, must be a string.`);
          return null;
        }
        const orientation = channelConfig.orientation || {
          closed: 'down',
          middle: 'stop',
          opened: 'up'
        };
        if (typeof orientation !== 'object' ||
            ['closed', 'middle', 'opened'].some(
              state => ['down', 'stop', 'up'].indexOf(orientation[state]) < 0
            )) {
          this.log(`Bad channel orientation at index ${index}.`);
          return null;
        }
        return new URTSIChannelAccessory(this, index + 1, {name, orientation});
      });
      callback(accessories.filter(accessory => accessory !== null));
    }
  }

  /**
   * Accessory "Somfy URTSI Channel"
   */

  class URTSIChannelAccessory extends Accessory {
    constructor(platform, channelNumber, channelConfig) {
      const displayName = `Somfy ${channelConfig.name}`;
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
        this.createWindowCoveringService(channelNumber, channelConfig)
      );
    }

    createWindowCoveringService(channelNumber, channelConfig) {
      const name = channelConfig.name;
      const orientation = channelConfig.orientation;

      const service = new Service.WindowCovering(name);

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
            `channel ${channelNumber} (${name})`,
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
            `channel ${channelNumber} (${name})`,
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
              ? channel[orientation.closed]()
              : targetValue === 100
                ? channel[orientation.opened]()
                : channel[orientation.middle]();

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
