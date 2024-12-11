const { InstanceStatus } = require('@companion-module/base')

const io = require('socket.io-client')

module.exports = {
	initConnection: function () {
		let self = this

		self.log('info', 'Initializing connection to gamepad-io...')

		//close any satellite connections
		self.CompanionSatellite_Close()
		self.CONTROLLER_SURFACE_UUID = undefined

		if (self.config.host) {
			self.config.port = 8809
			self.log('info', `Opening connection to gamepad-io: ${self.config.host}:${self.config.port}`)
			self.updateStatus(InstanceStatus.Connecting)
			self.socket = io.connect('http://' + self.config.host + ':' + self.config.port, { reconnection: true })
			self.log('info', 'Connecting to gamepad-io...')
			self.STATUS.information = 'Connecting to gamepad-io'
			self.checkVariables()

			// Add listeners
			self.socket.on('connect', function () {
				self.log('info', 'Connected to gamepad-io. Retrieving data.')
				self.updateStatus(InstanceStatus.Connecting, 'Connected, Waiting for Controller Data...')
				self.CONNECTED = true
				self.getConfigFields()
				self.STATUS.information = 'Connected'
				self.sendCommand('version', null, null)
				self.sendCommand('controllers')
				self.checkFeedbacks()
				self.checkVariables()
			})

			self.socket.on('disconnect', function () {
				self.updateStatus(InstanceStatus.Disconnected)
				self.log('error', 'Disconnected from gamepad-io.')
				self.CONNECTED = false
				self.STATUS.information = 'Disconnected'
				self.STATUS.controllers = []

				self.resetValues()

				self.getConfigFields()

				//disconnect satellites
				self.CompanionSatellite_Close()
				self.CONTROLLER_SURFACE_UUID = undefined

				self.initVariables() //reload variables to remove controller, button, axis data etc.

				self.checkFeedbacks()
				self.checkVariables()

				//wait 5 seconds and try again to connect
				self.log('info', 'Attempting to reconnect in 5 seconds...')

				self.RECONNECT_INTERVAL = setTimeout(function () {
					self.init(self.config)
				}, 5000)
			})

			self.socket.on('version', function (version) {
				self.STATUS.version = version
				let variableObj = {}
				variableObj['version'] = version
				self.setVariableValues(variableObj)
			})

			self.socket.on('controllers', function (controllers) {
				self.processControllers(controllers)
			})

			self.socket.on('button_event', function (uuid, buttonIndex, pressed, touched, val, pct) {
				self.processButtonEvent(uuid, buttonIndex, pressed, touched, val, pct)
			})

			self.socket.on('axis_event', function (uuid, idx, pressed, axis) {
				self.processAxisEvent(uuid, idx, pressed, axis)
			})

			self.socket.on('error', function (error) {
				self.updateStatus(InstanceStatus.Disconnected)
				self.log('error', 'Error from gamepad-io: ' + error)

				//close any satellite connections
				self.CompanionSatellite_Close()
				self.CONTROLLER_SURFACE_UUID = undefined

				self.checkFeedbacks()
				self.checkVariables()

				//wait 5 seconds and try again to connect
				self.log('info', 'Attempting to reconnect in 5 seconds...')
				self.RECONNECT_INTERVAL = setTimeout(function () {
					self.initConnection()
				}, 5000)
			})
		}
	},

	processControllers: function (controllers) {
		let self = this

		try {
			//compare the uuid's in the controllers array to the uuid's in the STATUS.controllers array and see if it is different - any new, any gone
			let changed = false

			if (controllers.length !== self.STATUS.controllers.length) {
				changed = true
			} else {
				for (let i = 0; i < controllers.length; i++) {
					let controller = controllers[i]
					let foundController = self.STATUS.controllers.find((obj) => obj.uuid === controller.uuid)
					if (foundController === undefined) {
						//a new controller was added
						changed = true
						break
					}
				}

				if (changed === false) {
					for (let i = 0; i < self.STATUS.controllers.length; i++) {
						let controller = self.STATUS.controllers[i]
						let foundController = controllers.find((obj) => obj.uuid === controller.uuid)
						if (foundController === undefined) {
							//a controller was removed
							changed = true
							break
						}
					}
				}
			}

			if (changed) {
				//only re-init if the array of controllers has changed
				if (self.config.verbose) {
					self.log('debug', 'Controllers changed. Re-running controller choice logic.')
				}

				self.STATUS.controllers = controllers //assign it now that we have checked for changes

				self.rebuildChoices()
				self.getConfigFields()

				self.initActions()
				self.initFeedbacks()
				self.initVariables()
				self.initPresets()
			} else {
				self.log('debug', 'No change in controllers detected.')
				return
			}

			//continue on because I didn't feel like moving this up

			//if length is 0, then we are not connected to a controller and the user may need to press a button on a gamepad first
			if (controllers.length === 0) {
				self.updateStatus(
					InstanceStatus.Connecting,
					'No controllers detected. Press a button on a gamepad to detect all connected gamepads.'
				)
			} else {
				//get the previously configured controller
				let selectedController = self.config.controller

				//see if the selected controller is in the list of controllers
				let foundController = controllers.find((controller) => controller.uuid === selectedController)

				if (selectedController === undefined) {
					//no controller selected, warn them
					self.log('warn', 'No controller selected. Please select a controller in the configuration.')
					self.updateStatus(
						InstanceStatus.Connecting,
						'No controller selected. Please select a controller in the configuration.'
					)
					self.loadSurfaceSettings() //go ahead and load defaults in case they want to use the surface area
				} else if (foundController === undefined) {
					//controller not found, warn them
					self.log(
						'warn',
						'Previously selected controller not found. Please select a new controller in the configuration.'
					)
					self.updateStatus(
						InstanceStatus.Connecting,
						'Previously selected controller not found. Please select a controller in the configuration.'
					)
				} else {
					//controller found, set it as the selected controller
					self.log('info', 'Controller detected: ' + foundController.id)

					//before setting the controller, we may need to leave the room of the previous controller
					if (self.CONTROLLER !== undefined) {
						if (self.CONTROLLER?.uuid !== foundController.uuid) {
							if (self.config.verbose) {
								self.log('debug', 'Leaving room for previous controller: ' + self.CONTROLLER.uuid)
							}

							self.socket.emit('leave_room', self.CONTROLLER.uuid)
						}
					}

					self.CONTROLLER = foundController
					self.CONTROLLER.name = self.CONTROLLER.id.split('(')[0].trim() //set the friendly name
					self.updateStatus(InstanceStatus.Ok)

					self.checkFeedbacks('controllerConnected')

					//join the socket io room for this controller
					if (self.config.verbose) {
						self.log('info', 'Subscribing to controller events for: ' + self.CONTROLLER.uuid)
					}

					self.socket.emit('join_room', self.CONTROLLER.uuid)

					//check the button mapping, if they did not choose one, just select generic
					if (self.config.buttonMapping === undefined) {
						//set the default button mapping and log it
						self.log('info', 'No button mapping selected. Defaulting to Generic.')
						self.config.buttonMapping = 'generic'
						self.saveConfig(self.config)
					}

					//now load the button mapping based on their selection
					self.loadButtonMapping()
					self.rebuildChoices()

					//re-init the actions, feedbacks, variables, and presets
					self.initActions()
					self.initFeedbacks()
					self.initVariables()
					self.initPresets()

					//if we are using this as a surface, we need to create the satellite
					if (self.config.useAsSurface) {
						self.loadSurfaceSettings()
						if (self.config.verbose) {
							self.log('debug', 'Using as Surface. Opening connection to Companion Satellite API.')
						}

						if (self.CONTROLLER_SURFACE_UUID !== self.CONTROLLER.uuid) {
							//close the previous connection
							if (self.config.verbose) {
								self.log('debug', 'Controller Surface UUID has changed. Restarting Satellite Connection.')
							}
							self.initSurface()
						} else {
							if (self.config.verbose) {
								self.log('debug', 'Controller Surface UUID has not changed. Not restarting Satellite Connection.')
							}
						}
						self.CONTROLLER_SURFACE_UUID = self.CONTROLLER.uuid
					}
				}
			}

			self.checkFeedbacks()
			self.checkVariables()
		} catch (e) {
			self.log('error', String(e))
		}
	},

	processButtonEvent: function (uuid, buttonIndex, pressed, touched, val, pct, holdValue = null) {
		//processes the data from the button event received from gamepad-io
		let self = this

		try {
			if (self.CONTROLLER) {
				//ignore the data if we do not have a controller configured
				//update the button data, but only if it is for the controller we are tracking
				if (self.CONTROLLER.uuid === uuid && self.LOCKED == false) {
					//first see if the value on this button is set to hold, and if so, ignore the event unless the holdValue is set to false
					//also if holdValue is set to true, set that value to the button object

					//if the hold value is null, this function call was generated from the gamepad app and not the "set value" function, so we need to check the button object to know what to do next

					if (holdValue == null) {
						let buttonHold = self.CONTROLLER.buttons[buttonIndex].buttonHold
						if (buttonHold === true) {
							//if the button is set to hold, then we need to ignore the event
							if (self.config.verbose) {
								self.log('debug', `Button ${buttonIndex} is set to hold. Ignoring event.`)
							}
							return
						}

						//now set holdValue to false, because we are not processing a "set value" function call
						holdValue = false
					}

					//now set the hold value to the button object
					self.CONTROLLER.buttons[buttonIndex].buttonHold = holdValue

					self.CONTROLLER.buttons[buttonIndex].pressed = pressed
					self.CONTROLLER.buttons[buttonIndex].touched = touched
					self.CONTROLLER.buttons[buttonIndex].val = val
					self.CONTROLLER.buttons[buttonIndex].pct = pct

					//we only want to press the button if it's pressed and percent is 100
					//and if the last button pressed is not the same as this one, or if our debounce timer has expired

					let { buttonDisplayValue, buttonRangeMin, buttonRangeMax } = self.calculateButtonDisplayValue(
						buttonIndex,
						val
					)

					//the key number is the button index
					let keyNumber = buttonIndex

					//check to see if the percentage is inverted on the button mapping
					let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === buttonIndex)

					if (buttonObj) {
						buttonInverted = buttonObj.buttonInverted
						if (buttonInverted) {
							//check to see if the percentage is inverted, otherwise ignore
							if (buttonObj.invertPercentage) {
								pct = 100 - pct
							}
						}
					}

					if (parseInt(pct) >= self.config.buttonPressThreshold) {
						if (self.LAST_BUTTON_PRESSED !== buttonIndex || self.LAST_BUTTON_PRESSED === -1) {
							if (self.config.useAsSurface) {
								self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumber} PRESSED=true`)
							}

							//keep track of the last button that was pressed, for debounce purposes
							self.LAST_BUTTON_PRESSED = buttonIndex

							//send haptic, if enabled
							if (self.config.hapticWhenPressed == true) {
								self.sendHapticFeedback(uuid, 'button', buttonIndex)
							}

							//start a lil timer for debounce purposes
							if (self.DEBOUNCE_TIMER !== undefined) {
								clearTimeout(self.DEBOUNCE_TIMER)
							}

							self.DEBOUNCE_TIMER = setTimeout(function () {
								self.LAST_BUTTON_PRESSED = -1
								self.DEBOUNCE_TIMER = undefined
							}, self.config.buttonDebounce)
						} else {
							if (self.config.verbose) {
								self.log(
									'debug',
									`Button ${buttonIndex} pressed, but debounce timer (${self.config.buttonDebounce}ms) is active.`
								)
							}
						}
					} else if (parseInt(pct) <= self.config.buttonReleaseThreshold) {
						if (self.config.useAsSurface) {
							self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumber} PRESSED=false`)
						}
					}

					//now set the variable
					let buttonId = buttonIndex //generic

					if (buttonObj) {
						buttonId = buttonObj.buttonId || buttonIndex
					}

					let variableObj = {}
					variableObj[`button_${buttonId}_pressed`] = pressed ? 'True' : 'False'
					variableObj[`button_${buttonId}_touched`] = touched ? 'True' : 'False'
					variableObj[`button_${buttonId}_val`] = val
					variableObj[`button_${buttonId}_val_abs`] = Math.abs(val)
					variableObj[`button_${buttonId}_val_display`] = buttonDisplayValue
					variableObj[`button_${buttonId}_val_display_abs`] = Math.abs(buttonDisplayValue) //absolute value
					variableObj[`button_${buttonId}_pct`] = pct
					variableObj[`button_${buttonId}_pct_abs`] = Math.abs(pct)
					variableObj[`button_${buttonId}_range_display_min`] = buttonRangeMin
					variableObj[`button_${buttonId}_range_display_max`] = buttonRangeMax
					variableObj[`button_${buttonId}_hold`] = holdValue ? 'True' : 'False'
					self.setVariableValues(variableObj)
				}

				self.checkFeedbacks()
				//really only want to call checkVariables when it's a larger dataset to process, as this can get costly over time
				//self.checkVariables();
			}
		} catch (e) {
			self.log('error', String(e))
		}
	},

	calculateButtonDisplayValue: function (buttonIndex, val) {
		let self = this

		let buttonDisplayValue = val
		let buttonRangeMin = 0
		let buttonRangeMax = 1

		if (self.config.buttonRangeMinDefault !== undefined) {
			buttonRangeMin = self.config.buttonRangeMinDefault
		}

		if (self.config.buttonRangeMaxDefault !== undefined) {
			buttonRangeMax = self.config.buttonRangeMaxDefault
		}

		if (self.MAPPING) {
			let buttonObj = self.MAPPING.buttons.find((obj) => obj.buttonIndex === buttonIndex)

			console.log(buttonObj)
			//if the button is inverted, then we need to invert the value
			if (buttonObj?.buttonInverted) {
				val = 1 - val
			}

			if (buttonObj && buttonObj.buttonRangeMin !== undefined && buttonObj.buttonRangeMax !== undefined) {
				//get the button range values, and remap the real button value to the range value, because that's what we will use in the variable we display
				buttonRangeMin = Number(buttonObj.buttonRangeMin)
				buttonRangeMax = Number(buttonObj.buttonRangeMax)
			}
		}

		let buttonValue = Number(val) //ensure it is a number

		//now we need to remap the button value to the range value
		buttonDisplayValue = Math.round(buttonRangeMin + buttonValue * (buttonRangeMax - buttonRangeMin))

		//set it to the controller object
		self.CONTROLLER.buttons[buttonIndex].buttonDisplayValue = buttonDisplayValue

		return { buttonDisplayValue, buttonRangeMin, buttonRangeMax }
	},

	processAxisEvent: function (uuid, idx, pressed, axis, holdValue = null) {
		let self = this

		try {
			if (self.CONTROLLER) {
				//update the axis data, but only if it is for the controller we are tracking
				if (self.CONTROLLER.uuid === uuid && self.LOCKED == false) {
					//first see if the value on this button is set to hold, and if so, ignore the event unless the holdValue is set to false
					//also if holdValue is set to true, set that value to the button object

					//if the hold value is null, this function call was generated from the gamepad app and not the "set value" function, so we need to check the button object to know what to do next

					if (holdValue === null) {
						let axisHold = self.CONTROLLER.axes[idx].axisHold
						if (axisHold === true) {
							//if the button is set to hold, then we need to ignore the event
							if (self.config.verbose) {
								self.log('debug', `Axis ${idx} is set to hold. Ignoring event.`)
							}
							return
						}

						//now set holdValue to false, because we are not processing a "set value" function call
						holdValue = false
					}

					//now set the hold value to the button object
					self.CONTROLLER.axes[idx].axisHold = holdValue

					self.CONTROLLER.axes[idx].pressed = pressed
					self.CONTROLLER.axes[idx].axis = axis

					let axisObj = undefined

					if (self.MAPPING) {
						axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === idx)
					}

					//the key number is the axis index + the number of buttons (offset)
					//if the axis is negative, it's one key, if it's positive, it's the other key

					let negSensitivity = -0.1 //default
					let posSensitivity = 0.1 //default

					//get the deadzones from the button mapping
					if (axisObj) {
						negSensitivity = Number(axisObj.axisNegDeadzone)
						posSensitivity = Number(axisObj.axisPosDeadzone)
					}

					let axisDeadzoneActive = false

					//if the event entirely falls within the deadzone, just assume it to be 0
					if (axis > negSensitivity && axis < posSensitivity) {
						axis = 0
						axisDeadzoneActive = true
						self.log('info', `Axis ${idx} is in the deadzone. Setting to 0.`)
					}

					let axisValue = Number(axis)

					let { axisDisplayValue, axisRangeMin, axisRangeMax } = self.calculateAxisDisplayValue(idx, axisValue)

					//now check the direction
					let axisDirection = 'Center'

					if (axisValue < 0) {
						axisDirection = 'Negative'

						//get the axis type from the button mapping definition and if it is X, use "left, it is Y, use "up"
						if (self.MAPPING) {
							let axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === idx)
							if (axisObj !== undefined) {
								if (axisObj?.axisType !== undefined) {
									axisDirection = axisObj.axisType.toLowerCase() === 'x' ? 'Left' : 'Up'
								}
							}
						}
					} else if (axisValue > 0) {
						axisDirection = 'Positive'

						//get the axis type from the button mapping definition and if it is X, use "right, it is Y, use "down"
						if (self.MAPPING) {
							let axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === idx)
							if (axisObj !== undefined) {
								if (axisObj?.axisType !== undefined) {
									axisDirection = axisObj.axisType.toLowerCase() === 'x' ? 'Right' : 'Down'
								}
							}
						}
					} else if (axisValue === 0) {
						axisDirection = 'Neutral'

						if (self.MAPPING) {
							let axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === idx)

							if (axisObj !== undefined) {
								if (axisObj?.axisType !== undefined) {
									axisDirection = 'Center'
								}
							}
						}
					}

					self.CONTROLLER.axes[idx].direction = axisDirection

					//now set the variable
					let axisId = idx //generic or otherwise unknown

					if (axisObj) {
						axisId = axisObj.axisId || idx
					}

					//check to see if the percentage is inverted on the button mapping
					if (axisObj) {
						axisInverted = axisObj.axisInverted
						if (axisInverted) {
							//check to see if the percentage is inverted, otherwise ignore
							if (axisObj.invertPercentage) {
								axisPct = 100 - axisPct
							}
						}
					}

					let variableObj = {}
					variableObj[`axis_${axisId}_pressed`] = pressed ? 'True' : 'False'
					variableObj[`axis_${axisId}_val`] = axisValue
					variableObj[`axis_${axisId}_val_abs`] = Math.abs(axisValue)
					variableObj[`axis_${axisId}_val_display`] = axisDisplayValue
					variableObj[`axis_${axisId}_val_display_abs`] = Math.abs(axisDisplayValue) //absolute value
					variableObj[`axis_${axisId}_pct`] = axisPct + '%'
					variableObj[`axis_${axisId}_pct_abs`] = Math.abs(axisPct) + '%'
					variableObj[`axis_${axisId}_direction`] = axisDirection
					variableObj[`axis_${axisId}_range_display_min`] = axisRangeMin
					variableObj[`axis_${axisId}_range_display_max`] = axisRangeMax
					variableObj[`axis_${axisId}_hold`] = holdValue ? 'True' : 'False'

					self.setVariableValues(variableObj)

					//now send the satellite command, if enabled
					if (self.config.axisMovementAsButtonPress) {
						//each axis will have two keys, one for negative and one for positive
						let keyNumberNeg = self.CONTROLLER.buttons.length + idx * 2 //offset the key number by the number of buttons on the controller
						let keyNumberPos = self.CONTROLLER.buttons.length + 1 + idx * 2 //offset the key number by the number of buttons on the controller

						let axisMovementPressThreshold = Number(self.config.axisMovementPressThreshold)

						let axisPctAbs = Math.abs(axisPct)
						let percentAllowed = 100 - axisMovementPressThreshold

						//if the deadzone is active, we do nothing
						if (axisDeadzoneActive) {
							//if the axis is in the deadzone, we release the buttons
							//self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberNeg} PRESSED=false`)
							//self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberPos} PRESSED=false`)
						} else {
							//if the percent is less than the threshold, we release; if greater than, we press
							if (axisPctAbs < percentAllowed) {
								//trigger a release depending on if it's positive or negative
								if (axisPct < 0) {
									self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberNeg} PRESSED=false`)
								} else if (axisPct > 0) {
									self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberPos} PRESSED=false`)
								}
							} else {
								if (axisPct < 0) {
									self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberNeg} PRESSED=true`)
									//send haptic, if enabled
									if (self.config.hapticWhenPressed == true) {
										self.sendHapticFeedback(uuid, 'axis', keyNumberNeg)
									}
								} else if (axisPct > 0) {
									self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${uuid} KEY=${keyNumberPos} PRESSED=true`)
									//send haptic, if enabled
									if (self.config.hapticWhenPressed == true) {
										self.sendHapticFeedback(uuid, 'axis', keyNumberPos)
									}
								}
							}
						}
					}
				}

				self.checkFeedbacks()
			}
		} catch (e) {
			self.log('error', String(e))
		}
	},

	calculateAxisDisplayValue: function (axisIndex, axisValue) {
		let self = this

		let axisRangeMin = -1
		let axisRangeMax = 1

		if (self.MAPPING) {
			axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === axisIndex)
		}

		//if we are inverting the axis, then we need to invert the value
		if (axisObj) {
			if (axisObj?.axisInverted) {
				axisValue = axisValue * -1
			}

			//get the axis range values, and remap the real axis value to the range value, because that's what we will use in the variable we display
			axisRangeMin = axisObj.axisRangeMin
			axisRangeMax = axisObj.axisRangeMax
		}

		//calculate the percent, the axis is a float from -1.0 to 1.0 and the percent can be -100% to 100%
		axisPct = Math.round(axisValue * 100)

		let axisRange = (axisRangeMax - axisRangeMin) / 2 //we are going to use the full range, so divide by 2

		//now we need to remap the axis value to the range value
		let axisDisplayValue = Math.round(axisValue * axisRange) // + axisRangeMin;

		//set it to the controller object
		self.CONTROLLER.axes[axisIndex].axisDisplayValue = axisDisplayValue

		return { axisDisplayValue, axisRangeMin, axisRangeMax }
	},

	rebuildChoices: function () {
		//rebuilds the choices for the controller, buttons, and axes for Companion dropdowns
		let self = this

		if (self.config.verbose) {
			self.log('debug', 'Rebuilding Choices for Controller, Buttons, and Axes.')
		}

		if (self.STATUS.controllers.length > 0) {
			self.CHOICES_CONTROLLERS = []

			//push the undefined option first
			self.CHOICES_CONTROLLERS.push({ id: undefined, label: '(select a controller)' })

			for (let i = 0; i < self.STATUS.controllers.length; i++) {
				let controller = self.STATUS.controllers[i]
				let controllerName = controller.id.split('(')[0].trim()
				controllerName = `${controllerName} (Buttons: ${controller.buttons.length}, Axes: ${controller.axes.length})`
				if (controller.inUse == true) {
					controllerName = 'IN USE: ' + controllerName
				}
				self.CHOICES_CONTROLLERS.push({ id: controller.uuid, label: controllerName })
			}
		} else {
			self.CHOICES_CONTROLLERS = [{ id: undefined, label: '(no controllers detected)' }]
		}

		if (self.CONTROLLER) {
			if (self.CONTROLLER.buttons.length > 0) {
				self.CHOICES_BUTTONS = []

				for (let i = 0; i < self.CONTROLLER.buttons.length; i++) {
					let label = 'Button ' + i

					if (self.MAPPING) {
						let buttonObj = self.MAPPING.buttons.find((obj) => obj.buttonIndex === i)
						if (buttonObj) {
							label = buttonObj.buttonName || 'Button ' + i
						}
					}

					self.CHOICES_BUTTONS.push({ id: i, label: label })
				}
			} else {
				self.CHOICES_BUTTONS = [{ id: '0', label: 'No Buttons Available' }]
			}

			if (self.CONTROLLER.axes.length > 0) {
				self.CHOICES_AXES = []

				for (let i = 0; i < self.CONTROLLER.axes.length; i++) {
					let label = 'Axis ' + i

					if (self.MAPPING) {
						let axisObj = self.MAPPING.axes.find((obj) => obj.axisIndex === i)
						if (axisObj) {
							label = axisObj.axisName || 'Axis ' + i
						}
					}

					self.CHOICES_AXES.push({ id: i.toString(), label: label })
				}
			} else {
				self.CHOICES_AXES = [{ id: '0', label: 'No Axes Available' }]
			}
		}
	},

	loadButtonMapping: function () {
		let self = this

		//load the button mapping based on their selection
		if (self.config.buttonMapping == 'generic') {
			//no need to do anything
			self.log('info', 'Loading Generic Button Mapping.')
			self.MAPPING = {
				buttons: [],
				axes: [],
			}
			return
		} else if (self.config.buttonMapping == 'custom') {
			//load the mapping from the stored config
			self.log('info', 'Loading Custom Button Mapping.')
			self.MAPPING = self.config.MAPPING
			if (self.MAPPING == undefined) {
				self.MAPPING = {
					buttons: [],
					axes: [],
				}
			}
		} else if (self.config.buttonMapping !== undefined) {
			self.log('info', `Loading Button Mapping: ${self.config.buttonMapping}`)

			if (self.config.buttonMapping === 'custom-file') {
				this.loadCustomMapping(this.config.customFile)
			} else {
				try {
					self.MAPPING = require(`./mappings/${self.config.buttonMapping}.json`)
				} catch (err) {
					self.log('error', `Error loading button mapping: ${err}`)
					self.MAPPING = {
						buttons: [],
						axes: [],
					}
					self.config.buttonMapping = 'generic'
				}
			}
		}

		//load defaults for any missing values
		//if (self.MAPPING) {
		//if self.config.buttonRangeMinDefault and self.config.buttonRangeMaxDefault are not set, set them to 0 and 1
		if (self.config.buttonRangeMinDefault === undefined) {
			self.config.buttonRangeMinDefault = 0
		}
		if (self.config.buttonRangeMaxDefault === undefined) {
			self.config.buttonRangeMaxDefault = 1
		}

		//loop through each button and assign defaults for disconnectBehavior, buttonRangeMin/Max, buttonType, buttonInverted, hapticType, hapticParams
		for (let i = 0; i < self.CONTROLLER.buttons.length; i++) {
			let buttonObj = self.CONTROLLER.buttons[i]
			let buttonMappingObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === buttonObj.buttonIndex)

			if (buttonMappingObj) {
				if (buttonMappingObj.disconnectBehavior === undefined) {
					self.logVerbose('info', `Button ${buttonObj.buttonIndex} missing disconnectBehavior. Setting to reset.`)
					buttonMappingObj.disconnectBehavior = 'reset'
				}
				if (buttonMappingObj.buttonRangeMin === undefined) {
					self.logVerbose(
						'info',
						`Button ${buttonObj.buttonIndex} missing buttonRangeMin. Setting to Config default of ${self.config.buttonRangeMinDefault}.`
					)
					buttonMappingObj.buttonRangeMin = self.config.buttonRangeMinDefault
				}
				if (buttonMappingObj.buttonRangeMax === undefined) {
					self.logVerbose(
						'info',
						`Button ${buttonObj.buttonIndex} missing buttonRangeMax. Setting to Config default of ${self.config.buttonRangeMaxDefault}.`
					)
					buttonMappingObj.buttonRangeMax = self.config.buttonRangeMaxDefault
				}
				if (buttonMappingObj.buttonType === undefined) {
					self.logVerbose('info', `Button ${buttonObj.buttonIndex} missing buttonType. Setting to type: button.`)
					buttonMappingObj.buttonType = 'button'
				}
				if (buttonMappingObj.buttonInverted === undefined) {
					self.logVerbose('info', `Button ${buttonObj.buttonIndex} missing buttonInverted. Setting to false.`)
					buttonMappingObj.buttonInverted = false
				}
				if (buttonMappingObj.hapticType === undefined) {
					self.logVerbose('info', `Button ${buttonObj.buttonIndex} missing hapticType. Setting to dual-rumble.`)
					buttonMappingObj.hapticType = 'dual-rumble'
				}
				if (buttonMappingObj.hapticParams === undefined) {
					self.logVerbose('info', `Button ${buttonObj.buttonIndex} missing hapticParams. Setting to default values.`)
					buttonMappingObj.hapticParams = {
						duration: 0.1,
						startDelay: 0,
						strongMagnitude: 1.0,
						weakMagnitude: 0.5,
					}
				}
			}
		}

		//if self.config.axisDeadzoneNegDefault and self.config.axisDeadzonePosDefault are not set, set them to 0.1
		if (self.config.axisDeadzoneNegDefault === undefined) {
			self.config.axisDeadzoneNegDefault = -0.1
		}
		if (self.config.axisDeadzonePosDefault === undefined) {
			self.config.axisDeadzonePosDefault = 0.1
		}

		//if self.config.axisRangeMinDefault and self.config.axisRangeMaxDefault are not set, set them to -1 and 1
		if (self.config.axisRangeMinDefault === undefined) {
			self.config.axisRangeMinDefault = -1
		}
		if (self.config.axisRangeMaxDefault === undefined) {
			self.config.axisRangeMaxDefault = 1
		}

		//loop through each axis and assign defaults for axisInverted, axisRangeMin/Max, axisType, axisInverted
		for (let i = 0; i < self.CONTROLLER.axes.length; i++) {
			let axisObj = self.CONTROLLER.axes[i]
			let axisMappingObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axisObj.axisIndex)

			if (axisMappingObj) {
				if (axisMappingObj.disconnectBehavior === undefined) {
					self.logVerbose('info', `Axis ${axisObj.axisIndex} missing disconnectBehavior. Setting to reset.`)
					axisMappingObj.disconnectBehavior = 'reset'
				}
				if (axisMappingObj.axisNegDeadzone === undefined) {
					self.logVerbose(
						'info',
						`Axis ${axisObj.axisIndex} missing axisNegDeadzone. Setting to default of ${self.config.axisDeadzoneNegDefault}.`
					)
					axisMappingObj.axisNegDeadzone = self.config.axisDeadzoneNegDefault
				}
				if (axisMappingObj.axisPosDeadzone === undefined) {
					self.logVerbose(
						'info',
						`Axis ${axisObj.axisIndex} missing axisPosDeadzone. Setting to default of ${self.config.axisDeadzonePosDefault}.`
					)
					axisMappingObj.axisPosDeadzone = self.config.axisDeadzonePosDefault
				}
				if (axisMappingObj.axisInverted === undefined) {
					self.logVerbose('info', `Axis ${axisObj.axisIndex} missing axisInverted. Setting to false.`)
					axisMappingObj.axisInverted = false
				}
				if (axisMappingObj.axisRangeMin === undefined) {
					self.logVerbose(
						'info',
						`Axis ${axisObj.axisIndex} missing axisRangeMin. Setting to Config default of ${self.config.axisRangeMinDefault}.`
					)
					axisMappingObj.axisRangeMin = self.config.axisRangeMinDefault
				}
				if (axisMappingObj.axisRangeMax === undefined) {
					self.logVerbose(
						'info',
						`Axis ${axisObj.axisIndex} missing axisRangeMax. Setting to Config default of ${self.config.axisRangeMaxDefault}.`
					)
					axisMappingObj.axisRangeMax = self.config.axisRangeMaxDefault
				}
				if (axisMappingObj.axisType === undefined) {
					self.logVerbose('info', `Axis ${axisObj.axisIndex} missing axisType. Setting to type: x.`)
					axisMappingObj.axisType = 'x'
				}
			}
		}
		//}

		//now save it to the config so it is stored for next time
		self.config.MAPPING = self.MAPPING
		self.saveConfig(self.config)
	},

	loadCustomMapping: function (path) {
		let self = this

		try {
			self.log('info', `Loading Custom Button Mapping from: ${path}`)
			self.MAPPING = require(path)
			self.config.MAPPING = self.MAPPING
			self.saveConfig(self.config)
		} catch (err) {
			self.log('error', `Error loading custom button mapping: ${err}`)
			self.MAPPING = undefined
			self.config.buttonMapping = 'generic'
		}
	},

	saveCustomMapping: function (path) {
		let self = this

		let fs = require('fs')

		try {
			self.log('info', `Saving Custom Button Mapping to: ${path}`)
			fs.writeFileSync(path, JSON.stringify(self.MAPPING, null, 2))
		} catch (err) {
			self.log('error', `Error saving custom button mapping: ${err}`)
		}
	},

	loadSurfaceSettings: function () {
		let self = this

		//surface ip/port defaults
		if (self.config.host_companion === undefined) {
			self.config.host_companion = '127.0.0.1'
		}

		if (self.config.port_companion === undefined) {
			self.config.port_companion = 16622
		}

		//set up the debounce, deadzones, etc.

		//haptic settings
		if (self.config.hapticWhenPressed === undefined) {
			self.config.hapticWhenPressed = false
		}

		//press and release thresholds
		if (self.config.buttonPressThreshold === undefined) {
			self.config.buttonPressThreshold = 100
		}
		//ensure it is a number and is positive
		self.config.buttonPressThreshold = Math.abs(Number(self.config.buttonPressThreshold))

		if (self.config.buttonReleaseThreshold === undefined) {
			self.config.buttonReleaseThreshold = 0
		}

		//ensure it is a number and is positive
		self.config.buttonReleaseThreshold = Math.abs(Number(self.config.buttonReleaseThreshold))

		//debounce
		if (self.config.buttonDebounce === undefined) {
			self.config.buttonDebounce = 50
		}
		//ensure it is a number and is positive
		self.config.buttonDebounce = Math.abs(Number(self.config.buttonDebounce))

		//axis movement as button press
		if (self.config.axisMovementAsButtonPress === undefined) {
			self.config.axisMovementAsButtonPress = false
		}

		//axis movement threshold
		if (self.config.axisMovementPressThreshold === undefined) {
			self.config.axisMovementPressThreshold = 5
		}

		//ensure it is a number and is positive
		self.config.axisMovementPressThreshold = Math.abs(Number(self.config.axisMovementPressThreshold))

		//now save the config so these values are displayed in the UI next time
		self.saveConfig(self.config)
	},

	sendHapticFeedback: function (uuid, buttonOrAxis, buttonIndex) {
		let self = this

		let type = 'none'
		let params = undefined

		let hapticObj = undefined

		//look up the haptic feedback for this button in self.MAPPING
		if (buttonOrAxis === 'button') {
			hapticObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === buttonIndex)
		} else if (buttonOrAxis === 'axis') {
			hapticObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === buttonIndex)
		}

		if (hapticObj) {
			type = hapticObj.hapticType || 'none'
			params = hapticObj.hapticParams
		}

		if (params === undefined) {
			params = {
				duration: 100,
				startDelay: 0,
				strongMagnitude: 1.0,
				weakMagnitude: 0.5,
			}

			if (type === 'trigger-rumble') {
				params.leftTrigger = 0.5
				params.rightTrigger = 0.5
			}
		}

		if (type !== 'none') {
			if (self.config.hapticWhenPressed) {
				if (self.config.verbose) {
					self.log('info', `Sending Haptic Feedback: ${type} from Button ${buttonIndex}`)
				}
				self.socket.emit('haptic', self.CONTROLLER.uuid, type, params)
			}
		}
	},

	resetValues: function () {
		let self = this

		self.LAST_BUTTON_PRESSED = -1
		clearInterval(self.DEBOUNCE_TIMER)
		self.DEBOUNCE_TIMER = undefined

		//loop through each button and see what they chose for the disconnect behavior for that button in self.MAPPING
		if (self.CONTROLLER) {
			for (let i = 0; i < self.CONTROLLER.buttons.length; i++) {
				let buttonObj = self.CONTROLLER.buttons[i]
				let buttonMappingObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === buttonObj.buttonIndex)
				if (buttonMappingObj && buttonMappingObj.disconnectBehavior === 'reset') {
					self.CONTROLLER.buttons[i].pressed = false
					self.CONTROLLER.buttons[i].touched = false
					self.CONTROLLER.buttons[i].val = 0
					self.CONTROLLER.buttons[i].pct = 0

					self.sendCompanionSatelliteCommand(
						`KEY-PRESS DEVICEID=${controller.uuid} KEY=${buttonObj.buttonIndex} PRESSED=false`
					)
				} else if (buttonMappingObj && buttonMappingObj.disconnectBehavior === 'hold') {
					//do nothing
				} else if (buttonMappingObj && buttonMappingObj.disconnectBehavior === 'custom') {
					let disconnectCustomValue = buttonMappingObj.disconnectCustomValue
					let buttonBehavior = buttonMappingObj.buttonBehavior

					if (buttonBehavior === 'released') {
						self.CONTROLLER.buttons[i].pressed = false
						self.CONTROLLER.buttons[i].touched = false

						self.sendCompanionSatelliteCommand(
							`KEY-PRESS DEVICEID=${controller.uuid} KEY=${buttonObj.buttonIndex} PRESSED=false`
						)
					} else if (buttonBehavior === 'pressed') {
						self.CONTROLLER.buttons[i].pressed = true
						self.CONTROLLER.buttons[i].touched = true

						self.sendCompanionSatelliteCommand(
							`KEY-PRESS DEVICEID=${controller.uuid} KEY=${buttonObj.buttonIndex} PRESSED=true`
						)
					}

					self.CONTROLLER.buttons[i].val = disconnectCustomValue
					self.CONTROLLER.buttons[i].pct = disconnectCustomValue * 100
				}

				let { buttonDisplayValue, buttonRangeMin, buttonRangeMax } = self.calculateButtonDisplayValue(
					i,
					self.CONTROLLER.buttons[i].val
				)
				self.CONTROLLER.buttons[i].buttonDisplayValue = buttonDisplayValue
				self.checkVariables()
			}

			for (let i = 0; i < self.CONTROLLER.axes.length; i++) {
				let axisObj = self.CONTROLLER.axes[i]
				let axisMappingObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axisObj.axisIndex)
				if (axisMappingObj && axisMappingObj?.disconnectBehavior === 'reset') {
					self.CONTROLLER.axes[i].pressed = false
					self.CONTROLLER.axes[i].axis = 0

					self.sendCompanionSatelliteCommand(
						`KEY-PRESS DEVICEID=${controller.uuid} KEY=${axisObj.axisIndex} PRESSED=false`
					)
				} else if (axisMappingObj && axisMappingObj?.disconnectBehavior === 'hold') {
					//do nothing because that's basically the default behavior
				} else if (axisMappingObj && axisMappingObj?.disconnectBehavior === 'custom') {
					let disconnectCustomValue = axisMappingObj.disconnectCustomValue
					let axisBehavior = axisMappingObj.axisBehavior

					if (axisBehavior === 'released') {
						self.CONTROLLER.axes[i].pressed = false

						self.sendCompanionSatelliteCommand(
							`KEY-PRESS DEVICEID=${controller.uuid} KEY=${axisObj.axisIndex} PRESSED=false`
						)
					} else if (axisBehavior === 'pressed') {
						self.CONTROLLER.axes[i].pressed = true

						self.sendCompanionSatelliteCommand(
							`KEY-PRESS DEVICEID=${controller.uuid} KEY=${axisObj.axisIndex} PRESSED=true`
						)
					}

					self.CONTROLLER.axes[i].axis = disconnectCustomValue
				}

				let { axisDisplayValue, axisRangeMin, axisRangeMax } = self.calculateAxisDisplayValue(
					i,
					self.CONTROLLER.axes[i].axis
				)
				self.CONTROLLER.axes[i].axisDisplayValue = axisDisplayValue
				self.checkVariables()
			}
		}
	},

	sendCommand: function (cmd, arg1 = null, arg2 = null) {
		let self = this

		if (self.config.verbose) {
			self.log('info', 'Sending: ' + cmd)
		}

		if (self.socket !== undefined) {
			if (arg1 !== null) {
				if (arg2 !== null) {
					self.socket.emit(cmd, arg1, arg2)
				} else {
					self.socket.emit(cmd, arg1)
				}
			} else {
				self.socket.emit(cmd)
			}
		} else {
			debug('Unable to send: Not connected to gamepad-io.')

			if (self.config.verbose) {
				self.log('warn', 'Unable to send: Not connected to gamepad-io.')
			}
		}
	},

	logVerbose: function (level, message) {
		let self = this

		if (self.config.verbose) {
			self.log(level, message)
		}
	},
}
