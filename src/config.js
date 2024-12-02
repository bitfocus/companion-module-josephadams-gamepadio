const { Regex } = require('@companion-module/base')

module.exports = {
	getConfigFields() {
		let self = this

		let configObj = []

		configObj.push({
			type: 'static-text',
			id: 'info',
			label: 'Information',
			width: 12,
			value: `This module allows you to use a gamepad as a controller surface for Companion. Must be used in conjunction with the gamepad-io software, available at <a href="http://github.com/josephdadams/gamepad-io">http://github.com/josephdadams/gamepad-io</a>.`,
		})

		configObj.push({
			type: 'static-text',
			id: 'info-start',
			label: 'Getting Started',
			width: 12,
			value: `To get started, download the gamepad-io software from the link above and follow the installation instructions. Once you have the software installed, you can connect to it by entering the host address below and clicking "Save".<br /><br />
			Once connected, you can press a button on your gamepad to have it detected by gamepad-io. Once detected, you can return to this configuration page to configure the controller and buttons. You can use multiple gamepads with gamepad-io by using separate instances of this module.`,
		})

		configObj.push({
			type: 'textinput',
			id: 'host',
			label: 'gamepad-io Host',
			width: 3,
			default: '127.0.0.1',
			regex: Regex.IP,
		})

		configObj.push({
			type: 'static-text',
			id: 'hr1',
			width: 12,
			label: '',
			value: '<hr />',
		})

		if (self.CONNECTED == true) {
			if (self.STATUS.controllers.length > 0) {
				//controller list
				configObj.push({
					type: 'dropdown',
					id: 'controller',
					label: 'Controller',
					width: 3,
					default: self.CHOICES_CONTROLLERS[0].id,
					choices: self.CHOICES_CONTROLLERS,
				})

				//button mapping
				configObj.push({
					type: 'static-text',
					id: 'info-buttonmapping',
					width: 12,
					label: 'Button Mapping',
					value: `The button mapping is the layout of the controller buttons and the way they are labeled in Variables and throughout the module when in use. By default, the buttons are labeled as Button 0, Button 1, etc. If you know the type of controller you are using, you can select it from the dropdown below.<br /><br />
					If your controller is not listed, you can submit a pull request to the <a href="http://github.com/bitfocus/companion/companion-module-josephadams-gamepadio">Companion Module repository</a> to add it.`,
				})

				//button mapping dropdown
				configObj.push({
					type: 'dropdown',
					id: 'buttonMapping',
					label: 'Button Mapping',
					width: 12,
					default: 'generic',
					choices: self.CHOICES_BUTTONMAPPING,
				})

				configObj.push({
					type: 'textinput',
					id: 'customFile',
					label: 'Custom Mapping File Path',
					width: 4,
					filetype: 'json',
					isVisible: (config) => config.buttonMapping == 'custom-file',
				})

				configObj.push({
					type: 'static-text',
					id: 'info-customfile',
					width: 8,
					label: 'Custom Mapping File',
					value:
						'If you have a custom mapping file, you can upload it here. The file should be in JSON format and contain the button and axis mappings for your controller. You can find examples in the mappings folder of the gamepad-io module repository.',
					isVisible: (config) => config.buttonMapping == 'custom-file',
				})

				//button mapping info
				//this is commented out because it's not being used right now and didn't really work that well since module configs are not meant to be dynamic

				/*let mappingId = self.config.buttonMapping;

				if (mappingId != undefined) {
					try {
						let mappingObj = require(`./mappings/${mappingId}.json`);

						if (mappingObj.description) {
							configObj.push({
								type: 'static-text',
								id: `info-description-${mappingId}`,
								width: 12,
								label: '',
								value: mappingObj.description,
							});
						}

						if (mappingObj.buttons) {
							for (let j = 0; j < mappingObj.buttons.length; j++) {
								let button = mappingObj.buttons[j];

								configObj.push({
									type: 'static-text',
									id: `${mappingId}-button-${button.buttonIndex}-name`,
									label: `Button ${button.buttonIndex}`,
									width: 3,
									value: `Button ${button.buttonIndex} will be mapped to ${button.buttonName}`,
								});
							}
						}

						if (mappingObj.axes) {
							for (let j = 0; j < mappingObj.axes.length; j++) {
								let axis = mappingObj.axes[j];

								let configAxisObj = {
									type: 'static-text',
									id: `${mappingId}-axis-${axis.axisIndex}-name`,
									label: `Axis ${axis.axisIndex}`,
									width: 3,
									value: `Axis ${axis.axisIndex} will be mapped to ${axis.axisName}`,
								};

								if (self.config.axisMovementAsButtonPress == true && self.CONTROLLER !== undefined) {
									//button number is the index of the axis * 2, plus the total number of buttons
									let buttonNumber1 = (axis.axisIndex * 2) + self.CONTROLLER?.buttons.length
									let buttonNumber2 = buttonNumber1 + 1;
									configAxisObj.value += ` and will trigger Surface Button Numbers ${buttonNumber1} and ${buttonNumber2} when moved.`;
								}

								configObj.push(configAxisObj);
							}
						}
					}
					catch (e) {
						//just quietly error out on this button mapping because something is wrong - like the json file doesn't exist
						console.error(e);
					}				
				}*/

				configObj.push({
					type: 'static-text',
					id: 'info-hr1',
					width: 12,
					label: '',
					value: '<hr />',
				})

				//use as surface
				configObj.push({
					type: 'checkbox',
					id: 'useAsSurface',
					label: 'Use controller as a Companion Satellite Surface',
					width: 12,
					default: true,
				})

				//satellite device settings -- localhost and port 16622
				configObj.push({
					type: 'textinput',
					id: 'host_companion',
					label: 'Companion Satellite Host',
					width: 3,
					default: '127.0.0.1',
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'textinput',
					id: 'port_companion',
					label: 'Companion Satellite Port',
					width: 3,
					default: 16622,
					isVisible: (config) => config.useAsSurface == true,
				})

				//hr
				configObj.push({
					type: 'static-text',
					id: 'info-hr2',
					width: 12,
					label: 'Button Settings',
					value: '<hr />',
					isVisible: (config) => config.useAsSurface == true,
				})

				//button surface settings

				//haptic when pressed
				configObj.push({
					type: 'checkbox',
					id: 'hapticWhenPressed',
					label: 'Haptic Feedback when Button Pressed (Experimental)',
					width: 4,
					default: false,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-haptic',
					width: 8,
					label: 'Haptic Feedback',
					value:
						'Haptic feedback will cause the controller to vibrate when a button is pressed. This is useful for tactile feedback when pressing buttons. You can set the type and other parameters in Actions per button.',
					isVisible: (config) => config.useAsSurface == true,
				})

				//button press/release thresholds
				configObj.push({
					type: 'textinput',
					id: 'buttonPressThreshold',
					label: 'Button Press Threshold (%)',
					width: 4,
					default: 10,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-buttonpressthreshold',
					width: 8,
					label: 'Button Press Threshold',
					value:
						'The button press threshold is the percentage of variance in the button that must be met to trigger a button <b>PRESS</b>. This is useful for buttons that may not fully reach 100% or if you want to trigger them early.',
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'textinput',
					id: 'buttonReleaseThreshold',
					label: 'Button Release Threshold (%)',
					width: 4,
					default: 10,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-buttonreleasethreshold',
					width: 8,
					label: 'Button Release Threshold',
					value:
						'The button release threshold is the percentage of variance in the button that must be met to trigger a button <b>RELEASE</b>. This is useful for buttons that may not fully reach 0% or if you want to trigger them early.',
					isVisible: (config) => config.useAsSurface == true,
				})

				//debounce
				configObj.push({
					type: 'textinput',
					id: 'buttonDebounce',
					label: 'Button Debounce (in ms)',
					width: 4,
					default: 50,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-debounce',
					width: 8,
					label: 'Button Debounce',
					value:
						'The debounce is the amount of time in milliseconds that must pass before the button can be pressed again. This is useful for buttons that are sensitive and may register multiple presses in a short amount of time.',
					isVisible: (config) => config.useAsSurface == true,
				})

				//button range display min/max defaults
				configObj.push({
					type: 'textinput',
					id: 'buttonRangeMinDefault',
					label: 'Button Range Minimum',
					width: 3,
					default: 0,
				})

				configObj.push({
					type: 'textinput',
					id: 'buttonRangeMaxDefault',
					label: 'Button Range Maximum',
					width: 3,
					default: 500,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-buttonrange',
					width: 6,
					label: 'Button Range Display Defaults',
					value:
						'The display range is the minimum and maximum values to actually display/use in variables. This is useful for changing the range of a button to a different value than the default 0 to 1.',
				})

				//hr
				configObj.push({
					type: 'static-text',
					id: 'info-hr2',
					width: 12,
					label: 'Axis Settings',
					value: '<hr />',
					isVisible: (config) => config.useAsSurface == true,
				})

				//axis movement as button press
				configObj.push({
					type: 'checkbox',
					id: 'axisMovementAsButtonPress',
					label: 'Use Axis Movement as Button Press',
					width: 4,
					default: false,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-axismovement',
					width: 8,
					label: 'Axis Movement as Button Press',
					value:
						'This option will allow you to use the movement of the axis as a button press. This is useful for joysticks that are not used for movement but rather for triggering actions. If enabled, all axes on the controller will each occupy two buttons on the surface, one for positive movement and one for negative movement.',
					isVisible: (config) => config.useAsSurface == true,
				})

				//percentage of variance to trigger a button press or release
				configObj.push({
					type: 'textinput',
					id: 'axisMovementPressThreshold',
					label: 'Axis Movement Threshold (%)',
					width: 4,
					default: 10,
					isVisible: (config) => config.axisMovementAsButtonPress == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-axismovementthreshold',
					width: 8,
					label: 'Axis Movement Threshold',
					value:
						'The axis movement threshold is the percentage of variance in the axis that must be met to trigger a button <b>PRESS</b> or <b>RELEASE. This is useful for joysticks that may not fully reach 100%. So, for example, if set to 10, the joystick must be within 90-100% to trigger a press, or 0-10% to trigger a release.',
					isVisible: (config) => config.axisMovementAsButtonPress == true,
				})

				//axis deadzone pos/neg defaults
				configObj.push({
					type: 'textinput',
					id: 'axisDeadzoneNegDefault',
					label: 'Axis Deadzone Negative Default',
					width: 3,
					default: -3,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'textinput',
					id: 'axisDeadzonePosDefault',
					label: 'Axis Deadzone Positive Default',
					width: 3,
					default: 3,
					isVisible: (config) => config.useAsSurface == true,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-axisdeadzone',
					width: 6,
					label: 'Axis Deadzone Defaults',
					value:
						'The axis deadzone is the percentage of variance in the axis that will be ignored. This is useful for joysticks that may not fully reach 0% or 100% and will prevent unwanted button presses. These are the default values that will be applied if you have not set them individually per-axis in Actions.',
					isVisible: (config) => config.useAsSurface == true,
				})

				//axis range display min/max defaults
				configObj.push({
					type: 'textinput',
					id: 'axisRangeMinDefault',
					label: 'Axis Range Default Minimum',
					width: 3,
					default: -100,
				})

				configObj.push({
					type: 'textinput',
					id: 'axisRangeMaxDefault',
					label: 'Axis Range Default Maximum',
					width: 3,
					default: 100,
				})

				configObj.push({
					type: 'static-text',
					id: 'info-axisrange',
					width: 6,
					label: 'Axis Range Display Defaults',
					value:
						'The display range is the minimum and maximum values to actually display/use in variables. This is useful for changing the range of an axis to a different value than the default -1 to 1. These are the default values that will be applied if you have not set them individually per-axis in Actions.',
				})
			} else {
				configObj.push({
					type: 'static-text',
					id: 'info-nocontrollers',
					width: 12,
					label: '',
					value:
						'<b>No controllers detected. Press a button on a gamepad for it to be detected by gamepad-io. Then return to this configuration page.</b>',
				})
			}
		} else {
			configObj.push({
				type: 'static-text',
				id: 'info-notconnected',
				width: 12,
				label: '',
				value: `<b>Not connected to gamepad-io. Make sure the software is running, enter the host address and click "Save" to connect, and then return to this configuration page.</b>`,
			})
		}

		configObj.push({
			type: 'static-text',
			id: 'hr2',
			width: 12,
			label: '',
			value: '<hr />',
		})

		configObj.push({
			type: 'static-text',
			id: 'info-verbose',
			label: 'Verbose Logging',
			width: 12,
			value: `Enabling this option will put more detail in the log, which can be useful for troubleshooting purposes.`,
		})

		configObj.push({
			type: 'checkbox',
			id: 'verbose',
			label: 'Enable Verbose Logging',
			width: 3,
			default: false,
		})

		return configObj
	},
}
