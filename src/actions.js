module.exports = {
	initActions: function () {
		let self = this
		let actions = {}

		if (self.config.useAsSurface) {
			//haptic settings, if enabled
			if (self.config.hapticWhenPressed) {
				actions.enableHapticFeedback = {
					name: 'Surface Settings - Enable/Disable Haptic Feedback',
					options: [
						{
							type: 'dropdown',
							label: 'Enable Haptic Feedback',
							id: 'enable',
							default: 'On',
							choices: [
								{ id: 'On', label: 'On' },
								{ id: 'Off', label: 'Off' },
							],
						},
					],
					callback: async (action) => {
						self.config.hapticWhenPressed = action.options.enable == 'On' ? true : false
						self.saveConfig(self.config)
						self.checkFeedbacks()
						self.checkVariables()
					},
				}
				actions.setHapticFeedback = {
					name: 'Surface Settings - Set Haptic Properties per Button',
					description: 'Change the haptic feedback settings for a specific button on the controller.',
					options: [
						{
							type: 'dropdown',
							label: 'Button',
							id: 'button',
							default: self.CHOICES_BUTTONS[0].id,
							choices: self.CHOICES_BUTTONS,
						},
						//checkbox for enabled/disabled
						{
							type: 'checkbox',
							label: 'Enable Haptic Feedback',
							id: 'enable',
							default: true,
						},
						{
							type: 'dropdown',
							label: 'Haptic Feedback Type',
							id: 'type',
							default: self.CHOICES_HAPTIC_TYPES[0].id,
							choices: self.CHOICES_HAPTIC_TYPES,
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Duration (in ms)',
							id: 'duration',
							default: '500',
							useVariables: true,
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Start Delay (in ms)',
							id: 'startDelay',
							default: '0',
							useVariables: true,
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Strong Magnitude (0.0-1.0)',
							id: 'strongMagnitude',
							default: '0.5',
							useVariables: true,
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Weak Magnitude (0.0-1.0)',
							id: 'weakMagnitude',
							default: '0.5',
							useVariables: true,
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Left Trigger (0.0-1.0)',
							id: 'leftTrigger',
							default: '0.5',
							useVariables: true,
							isVisible: (options) => options.type == 'trigger-rumble',
						},
						{
							type: 'textinput',
							label: 'Haptic Feedback Right Trigger (0.0-1.0)',
							id: 'rightTrigger',
							default: '0.5',
							useVariables: true,
							isVisible: (options) => options.type == 'trigger-rumble',
						},
					],
					callback: async (action) => {
						let button = parseInt(action.options.button)

						//if enabled, get the values
						if (action.options.enable) {
							let type = action.options.type
							let duration = await self.parseVariablesInString(action.options.duration)
							let startDelay = await self.parseVariablesInString(action.options.startDelay)
							let strongMagnitude = await self.parseVariablesInString(action.options.strongMagnitude)
							let weakMagnitude = await self.parseVariablesInString(action.options.weakMagnitude)
							let leftTrigger = await self.parseVariablesInString(action.options.leftTrigger)
							let rightTrigger = await self.parseVariablesInString(action.options.rightTrigger)

							//ensure is number and is positive
							duration = parseInt(duration)
							if (duration < 0 || isNaN(duration)) {
								duration = 0
							}

							//ensure is number and is positive
							startDelay = parseInt(startDelay)
							if (startDelay < 0 || isNaN(startDelay)) {
								startDelay = 0
							}

							//ensure is number and is between 0 and 1
							strongMagnitude = parseFloat(strongMagnitude)
							if (strongMagnitude < 0 || strongMagnitude > 1 || isNaN(strongMagnitude)) {
								strongMagnitude = 0.5
							}

							//ensure is number and is between 0 and 1
							weakMagnitude = parseFloat(weakMagnitude)
							if (weakMagnitude < 0 || weakMagnitude > 1 || isNaN(weakMagnitude)) {
								weakMagnitude = 0.5
							}

							//ensure is number and is between 0 and 1
							leftTrigger = parseFloat(leftTrigger)
							if (leftTrigger < 0 || leftTrigger > 1 || isNaN(leftTrigger)) {
								leftTrigger = 0.5
							}

							//ensure is number and is between 0 and 1
							rightTrigger = parseFloat(rightTrigger)
							if (rightTrigger < 0 || rightTrigger > 1 || isNaN(rightTrigger)) {
								rightTrigger = 0.5
							}

							//build params object
							let params = {
								duration: duration,
								startDelay: startDelay,
								strongMagnitude: strongMagnitude,
								weakMagnitude: weakMagnitude,
							}

							if (type == 'trigger-rumble') {
								params.leftTrigger = leftTrigger
								params.rightTrigger = rightTrigger
							}
						} else {
							type = 'none'
							params = {}
						}

						//find the button in the button mapping and add the type/params
						let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)
						if (buttonObj) {
							buttonObj.hapticType = type
							buttonObj.hapticParams = params
						}

						//if no mapping, create one
						if (!buttonObj) {
							self.MAPPING?.buttons.push({ buttonIndex: button, hapticType: type, hapticParams: params })
						}

						//save the mapping to the config table
						self.config.MAPPING = self.MAPPING
						self.config.buttonMapping = 'custom'
						self.saveConfig(self.config)
						self.checkFeedbacks()
						self.checkVariables()
					},
				}
			}

			actions.setButtonPressThreshold = {
				name: 'Surface Settings - Set Button Press Threshold',
				description: 'Change the percentage of variance in the button that must be met to trigger a button *PRESS*.',
				options: [
					{
						type: 'textinput',
						label: 'Button Press Threshold (%)',
						id: 'threshold',
						default: '50',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let threshold = await self.parseVariablesInString(action.options.threshold)

					//make sure there is no % sign
					if (threshold.includes('%')) {
						threshold = threshold.replace('%', '')
					}

					threshold = parseInt(threshold)

					//ensure is number and is positive
					if (isNaN(threshold)) {
						threshold = 100
					}

					self.config.buttonPressThreshold = Math.abs(threshold)

					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setButtonReleaseThreshold = {
				name: 'Surface Settings - Set Button Release Threshold',
				description: 'Change the percentage of variance in the button that must be met to trigger a button *RELEASE*.',
				options: [
					{
						type: 'textinput',
						label: 'Button Release Threshold (%)',
						id: 'threshold',
						default: '50',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let threshold = await self.parseVariablesInString(action.options.threshold)

					//make sure there is no % sign
					if (threshold.includes('%')) {
						threshold = threshold.replace('%', '')
					}

					threshold = parseInt(threshold)

					//ensure is number and is positive
					if (isNaN(threshold)) {
						threshold = 0
					}

					self.config.buttonReleaseThreshold = Math.abs(threshold)

					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.buttonType = {
				name: 'Surface Settings - Set Button Type',
				description: 'Change the button type for a specific button on the controller.',
				options: [
					{
						type: 'dropdown',
						label: 'Button',
						id: 'button',
						default: self.CHOICES_BUTTONS[0].id,
						choices: self.CHOICES_BUTTONS,
					},
					{
						type: 'dropdown',
						label: 'Button Type',
						id: 'type',
						default: 'button',
						choices: [
							{ id: 'button', label: 'Button' },
							{ id: 'trigger', label: 'Trigger' },
						],
					},
				],
				callback: async (action) => {
					let button = parseInt(action.options.button)
					let type = action.options.type

					let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)

					if (buttonObj) {
						buttonObj.buttonType = type
					}

					//if no mapping, create one
					if (!buttonObj) {
						self.MAPPING?.buttons.push({ buttonIndex: button, buttonType: type })
					}

					//save the mapping to the config table
					self.config.MAPPING = self.MAPPING
					self.config.buttonMapping = 'custom'
					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			//invert button press - choice of button
			actions.invertButtonPress = {
				name: 'Surface Settings - Invert Button Press',
				description: 'Invert the button press behavior for a specific button on the controller.',
				options: [
					{
						type: 'dropdown',
						label: 'Button',
						id: 'button',
						default: self.CHOICES_BUTTONS[0].id,
						choices: self.CHOICES_BUTTONS,
					},
					{
						type: 'dropdown',
						label: 'Invert Button Press',
						id: 'invert',
						default: 'Off',
						choices: [
							{ id: 'Off', label: 'Off' },
							{ id: 'On', label: 'On' },
						],
					},
				],
				callback: async (action) => {
					let button = parseInt(action.options.button)
					let invert = action.options.invert == 'On' ? true : false

					let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)
					if (buttonObj) {
						buttonObj.buttonInverted = invert
					}

					//if no mapping, create one
					if (!buttonObj) {
						self.MAPPING?.buttons.push({ buttonIndex: button, buttonInverted: invert })
					}

					//save the mapping to the config table
					self.config.MAPPING = self.MAPPING
					self.config.buttonMapping = 'custom'
					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setButtonDebounce = {
				name: 'Surface Settings - Set Button Debounce',
				description:
					'Change the amount of time in milliseconds that must pass before another press of the same button can be registered again.',
				options: [
					{
						type: 'textinput',
						label: 'Button Debounce (in ms)',
						id: 'debounce',
						default: '50',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let debounce = await self.parseVariablesInString(action.options.debounce)

					//ensure is number and is positive
					debounce = parseInt(debounce)
					if (debounce < 0 || isNaN(debounce)) {
						debounce = 0
					}
					self.config.buttonDebounce = debounce

					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setAxisDeadzones = {
				name: 'Surface Settings - Set Axis Deadzones',
				description: 'Change the range of the joystick/axis movement that is ignored.',
				options: [
					{
						type: 'dropdown',
						label: 'Axis',
						id: 'axis',
						default: self.CHOICES_AXES[0].id,
						choices: self.CHOICES_AXES,
					},
					{
						type: 'textinput',
						label: 'Axis Deadzone Negative (Negative Value between -1 and 0)',
						id: 'deadzone_neg',
						default: '0',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Axis Deadzone Positive (Positive Value between 0 and 1)',
						id: 'deadzone_pos',
						default: '0',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let deadzone_neg = await self.parseVariablesInString(action.options.deadzone_neg)
					let deadzone_pos = await self.parseVariablesInString(action.options.deadzone_pos)

					deadzone_neg = parseFloat(deadzone_neg) * -1 //ensure neg is negative number
					deadzone_pos = parseFloat(deadzone_pos)

					//ensure neg is negative number and pos is positive number
					if (isNaN(deadzone_neg)) {
						deadzone_neg = 0
					}
					if (isNaN(deadzone_pos)) {
						deadzone_pos = 0
					}

					let axis = parseInt(action.options.axis)

					let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)

					if (axisObj) {
						axisObj.axisNegDeadzone = deadzone_neg
						axisObj.axisPosDeadzone = deadzone_pos
					}

					//if no mapping, create one
					if (!axisObj) {
						self.MAPPING?.axes.push({ axisIndex: axis, axisNegDeadzone: deadzone_neg, axisPosDeadzone: deadzone_pos })
					}

					//save the mapping to the config table
					self.config.MAPPING = self.MAPPING
					self.config.buttonMapping = 'custom'
					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setAxisMovementAsButtonPress = {
				name: 'Surface Settings - Set Axis Movement as Button Press',
				description: 'Allow axis movement can be interpreted as a surface button press.',
				options: [
					{
						type: 'dropdown',
						label: 'Use Axis Movement as Button Press',
						id: 'movement',
						default: 'Off',
						choices: [
							{ id: 'Off', label: 'Off' },
							{ id: 'On', label: 'On' },
						],
					},
				],
				callback: async (action) => {
					self.config.axisMovementAsButtonPress = action.options.movement == 'On' ? true : false
					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setAxisMovementPressThreshold = {
				name: 'Surface Settings - Set Axis Movement Press Threshold',
				description:
					'Change the percentage of variance in the axis in order for a button to be *PRESSED* or *RELEASED*.',
				options: [
					{
						type: 'textinput',
						label: 'Axis Movement Press Threshold (%)',
						id: 'threshold',
						default: '5',
						useVariables: true,
					},
				],
				callback: async (action) => {
					let threshold = await self.parseVariablesInString(action.options.threshold)

					//make sure there is no % sign
					if (threshold.includes('%')) {
						threshold = threshold.replace('%', '')
					}

					threshold = parseInt(threshold)

					//ensure is number and is positive
					if (isNaN(threshold)) {
						threshold = 100
					}

					self.config.axisMovementThreshold = Math.abs(threshold)

					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}

			actions.setAxisHaptic = {
				name: 'Surface Settings - Set Axis Haptic Properties Per Axis',
				description: 'Change the haptic feedback settings for a specific axis on the controller.',
				options: [
					{
						type: 'dropdown',
						label: 'Axis',
						id: 'axis',
						default: self.CHOICES_AXES[0].id,
						choices: self.CHOICES_AXES,
					},
					//checkbox for enabled/disabled
					{
						type: 'checkbox',
						label: 'Enable Haptic Feedback',
						id: 'enable',
						default: true,
					},
					{
						type: 'dropdown',
						label: 'Haptic Feedback Type',
						id: 'type',
						default: self.CHOICES_HAPTIC_TYPES[0].id,
						choices: self.CHOICES_HAPTIC_TYPES,
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Duration (in ms)',
						id: 'duration',
						default: '500',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Start Delay (in ms)',
						id: 'startDelay',
						default: '0',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Strong Magnitude (0.0-1.0)',
						id: 'strongMagnitude',
						default: '0.5',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Weak Magnitude (0.0-1.0)',
						id: 'weakMagnitude',
						default: '0.5',
						useVariables: true,
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Left Trigger (0.0-1.0)',
						id: 'leftTrigger',
						default: '0.5',
						useVariables: true,
						isVisible: (options) => options.type == 'trigger-rumble',
					},
					{
						type: 'textinput',
						label: 'Haptic Feedback Right Trigger (0.0-1.0)',
						id: 'rightTrigger',
						default: '0.5',
						useVariables: true,
						isVisible: (options) => options.type == 'trigger-rumble',
					},
				],
				callback: async (action) => {
					let axis = parseInt(action.options.axis)

					//if enabled, get the values
					if (action.options.enable) {
						let type = action.options.type
						let duration = await self.parseVariablesInString(action.options.duration)
						let startDelay = await self.parseVariablesInString(action.options.startDelay)
						let strongMagnitude = await self.parseVariablesInString(action.options.strongMagnitude)
						let weakMagnitude = await self.parseVariablesInString(action.options.weakMagnitude)
						let leftTrigger = await self.parseVariablesInString(action.options.leftTrigger)
						let rightTrigger = await self.parseVariablesInString(action.options.rightTrigger)

						//ensure is number and is positive
						duration = parseInt(duration)
						if (duration < 0 || isNaN(duration)) {
							duration = 0
						}

						//ensure is number and is positive
						startDelay = parseInt(startDelay)
						if (startDelay < 0 || isNaN(startDelay)) {
							startDelay = 0
						}

						//ensure is number and is between 0 and 1
						strongMagnitude = parseFloat(strongMagnitude)
						if (strongMagnitude < 0 || strongMagnitude > 1 || isNaN(strongMagnitude)) {
							strongMagnitude = 0.5
						}

						//ensure is number and is between 0 and 1
						weakMagnitude = parseFloat(weakMagnitude)
						if (weakMagnitude < 0 || weakMagnitude > 1 || isNaN(weakMagnitude)) {
							weakMagnitude = 0.5
						}

						//ensure is number and is between 0 and 1
						leftTrigger = parseFloat(leftTrigger)
						if (leftTrigger < 0 || leftTrigger > 1 || isNaN(leftTrigger)) {
							leftTrigger = 0.5
						}

						//ensure is number and is between 0 and 1
						rightTrigger = parseFloat(rightTrigger)
						if (rightTrigger < 0 || rightTrigger > 1 || isNaN(rightTrigger)) {
							rightTrigger = 0.5
						}

						//build params object
						let params = {
							duration: duration,
							startDelay: startDelay,
							strongMagnitude: strongMagnitude,
							weakMagnitude: weakMagnitude,
						}

						if (type == 'trigger-rumble') {
							params.leftTrigger = leftTrigger
							params.rightTrigger = rightTrigger
						}
					} else {
						type = 'none'
						params = {}
					}

					//find the axis in the axis mapping and add the type/params
					let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
					if (axisObj) {
						axisObj.hapticType = type
						axisObj.hapticParams = params
					}

					//if no mapping, create one
					if (!axisObj) {
						self.MAPPING?.axes.push({ axisIndex: axis, hapticType: type, hapticParams: params })
					}

					//save the mapping to the config table
					self.config.MAPPING = self.MAPPING
					self.config.buttonMapping = 'custom'
					self.saveConfig(self.config)
					self.checkFeedbacks()
					self.checkVariables()
				},
			}
		}

		actions.setButtonRangeDisplay = {
			name: 'Button - Set Button Range Display',
			description: 'Change the display range of the minimum and maximum values of the button.',
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
				{
					type: 'textinput',
					label: 'Button Range Display Min',
					id: 'range_min',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Button Range Display Max',
					id: 'range_max',
					default: '100',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let range_min = await self.parseVariablesInString(action.options.range_min)
				let range_max = await self.parseVariablesInString(action.options.range_max)

				range_min = parseInt(range_min)
				range_max = parseInt(range_max)

				//ensure min is less than max
				if (isNaN(range_min) || isNaN(range_max)) {
					range_min = 0
					range_max = 100
				}

				if (range_min > range_max) {
					let temp = range_min
					range_min = range_max
					range_max = temp
				}

				let button = parseInt(action.options.button)

				if (self.config.verbose) {
					self.log('info', `Setting Button Range Display for ${button} to ${range_min} - ${range_max}`)
				}

				let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)
				if (buttonObj) {
					buttonObj.buttonRangeMin = range_min
					buttonObj.buttonRangeMax = range_max
				}

				//if no mapping, create one
				if (!buttonObj) {
					self.MAPPING?.buttons.push({ buttonIndex: button, buttonRangeMin: range_min, buttonRangeMax: range_max })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.setAxisRangeDisplay = {
			name: 'Axis - Set Axis Range Display',
			description: 'Change the display range of the minimum and maximum values of the axes.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'textinput',
					label: 'Axis Range Display Min',
					id: 'range_min',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Axis Range Display Max',
					id: 'range_max',
					default: '100',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let range_min = await self.parseVariablesInString(action.options.range_min)
				let range_max = await self.parseVariablesInString(action.options.range_max)

				range_min = parseInt(range_min)
				range_max = parseInt(range_max)

				//ensure min is less than max
				if (isNaN(range_min) || isNaN(range_max)) {
					range_min = 0
					range_max = 100
				}

				if (range_min > range_max) {
					let temp = range_min
					range_min = range_max
					range_max = temp
				}

				let axis = parseInt(action.options.axis)

				if (self.config.verbose) {
					self.log('info', `Setting Axis Range Display for ${axis} to ${range_min} - ${range_max}`)
				}

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
				if (axisObj) {
					axisObj.axisRangeMin = range_min
					axisObj.axisRangeMax = range_max
				}

				//if no mapping, create one
				if (!axisObj) {
					self.MAPPING?.axes.push({ axisIndex: axis, axisRangeMin: range_min, axisRangeMax: range_max })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.setAxisType = {
			name: 'Controller - Set Axis Type',
			description: 'Used to tell the module whether this is an X or Y axis, which informs the variable outputs.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'dropdown',
					label: 'Axis Type',
					id: 'type',
					default: 'x',
					choices: [
						{ id: 'x', label: 'X Axis' },
						{ id: 'y', label: 'Y Axis' },
					],
				},
			],
			callback: async (action) => {
				let axis = parseInt(action.options.axis)
				let type = action.options.type

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
				if (axisObj) {
					axisObj.axisType = type
				}

				//if no mapping, create one
				if (!axisObj) {
					self.MAPPING?.axes.push({ axisIndex: axis, axisType: type })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.axisInvert = {
			name: 'Axis - Invert Axis',
			description: 'Used to invert a specific axis so that negative movement becomes positive, etc.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'dropdown',
					label: 'Invert Axis',
					id: 'invert',
					default: 'Off',
					choices: [
						{ id: 'Off', label: 'Off' },
						{ id: 'On', label: 'On' },
					],
				},
			],
			callback: async (action) => {
				let axis = parseInt(action.options.axis)
				let invert = action.options.invert == 'On' ? true : false

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
				if (axisObj) {
					axisObj.axisInverted = invert
				}

				//if no mapping, create one
				if (!axisObj) {
					self.MAPPING?.axes.push({ axisIndex: axis, axisInverted: invert })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		//choice to lock or unlock
		actions.controllerLock = {
			name: 'Controller - Lock/Unlock Controller',
			description: 'Locks the controller so that no further input is accepted.',
			options: [
				{
					type: 'dropdown',
					label: 'Lock Controller',
					id: 'lock',
					default: 'Lock',
					choices: [
						{ id: 'Lock', label: 'Lock' },
						{ id: 'Unlock', label: 'Unlock' },
					],
				},
			],
			callback: async (action) => {
				let lock = action.options.lock == 'Lock' ? true : false

				if (lock) {
					self.log('info', 'Controller is now locked. No further input will be accepted.')
				} else {
					self.log('info', 'Controller is now unlocked. Input will be accepted.')
				}

				self.LOCKED = lock
				self.checkFeedbacks('controllerLocked')

				//set variable to locked
				self.setVariableValues({ controller_locked: self.LOCKED })
			},
		}

		actions.sendHaptic = {
			name: 'Controller - Send Haptic Feedback Now',
			description: 'Sends a Haptic Feedback command (with type, intensity and duration) to the Controller.',
			options: [
				{
					type: 'dropdown',
					label: 'Haptic Feedback Type',
					id: 'type',
					default: self.CHOICES_HAPTIC_TYPES[0].id,
					choices: self.CHOICES_HAPTIC_TYPES,
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Duration (in ms)',
					id: 'duration',
					default: '500',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Start Delay (in ms)',
					id: 'startDelay',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Strong Magnitude (0.0-1.0)',
					id: 'strongMagnitude',
					default: '0.5',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Weak Magnitude (0.0-1.0)',
					id: 'weakMagnitude',
					default: '0.5',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Left Trigger (0.0-1.0)',
					id: 'leftTrigger',
					default: '0.5',
					useVariables: true,
					isVisible: (options) => options.type == 'trigger-rumble',
				},
				{
					type: 'textinput',
					label: 'Haptic Feedback Right Trigger (0.0-1.0)',
					id: 'rightTrigger',
					default: '0.5',
					useVariables: true,
					isVisible: (options) => options.type == 'trigger-rumble',
				},
			],
			callback: async (action) => {
				let type = action.options.type
				let duration = await self.parseVariablesInString(action.options.duration)
				let startDelay = await self.parseVariablesInString(action.options.startDelay)
				let strongMagnitude = await self.parseVariablesInString(action.options.strongMagnitude)
				let weakMagnitude = await self.parseVariablesInString(action.options.weakMagnitude)
				let leftTrigger = await self.parseVariablesInString(action.options.leftTrigger)
				let rightTrigger = await self.parseVariablesInString(action.options.rightTrigger)

				//ensure is number and is positive
				duration = parseInt(duration)
				if (duration < 0 || isNaN(duration)) {
					duration = 0
				}

				//ensure is number and is positive
				startDelay = parseInt(startDelay)
				if (startDelay < 0 || isNaN(startDelay)) {
					startDelay = 0
				}

				//ensure is number and is between 0 and 1
				strongMagnitude = parseFloat(strongMagnitude)
				if (strongMagnitude < 0 || strongMagnitude > 1 || isNaN(strongMagnitude)) {
					strongMagnitude = 0.5
				}

				//ensure is number and is between 0 and 1
				weakMagnitude = parseFloat(weakMagnitude)
				if (weakMagnitude < 0 || weakMagnitude > 1 || isNaN(weakMagnitude)) {
					weakMagnitude = 0.5
				}

				//ensure is number and is between 0 and 1
				leftTrigger = parseFloat(leftTrigger)
				if (leftTrigger < 0 || leftTrigger > 1 || isNaN(leftTrigger)) {
					leftTrigger = 0.5
				}

				//ensure is number and is between 0 and 1
				rightTrigger = parseFloat(rightTrigger)
				if (rightTrigger < 0 || rightTrigger > 1 || isNaN(rightTrigger)) {
					rightTrigger = 0.5
				}

				//build params object
				let params = {
					duration: duration,
					startDelay: startDelay,
					strongMagnitude: strongMagnitude,
					weakMagnitude: weakMagnitude,
				}

				if (type == 'trigger-rumble') {
					params.leftTrigger = leftTrigger
					params.rightTrigger = rightTrigger
				}

				self.socket.emit('haptic', self.CONTROLLER.uuid, type, params)
			},
		}

		actions.setButtonMapping = {
			//button selection, variable id, button name
			name: 'Controller - Set Button Mapping',
			description: 'Change the button name and id for a specific button on the controller.',
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
				{
					type: 'textinput',
					label: 'Button Name',
					id: 'name',
					default: 'Button 1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Button ID',
					id: 'id',
					default: 'btn1',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let button = parseInt(action.options.button)
				let name = await self.parseVariablesInString(action.options.name)
				let id = await self.parseVariablesInString(action.options.id)

				let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)
				if (buttonObj) {
					buttonObj.buttonName = name
					buttonObj.buttonId = id
				}

				//if no mapping, create one
				if (!buttonObj) {
					self.MAPPING?.buttons.push({ buttonIndex: button, buttonName: name, buttonId: id })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.setAxisMapping = {
			name: 'Controller - Set Axis Mapping',
			description: 'Change the axis name and id for a specific axis on the controller.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'textinput',
					label: 'Axis Name',
					id: 'name',
					default: 'Axis 1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Axis ID',
					id: 'id',
					default: 'axis1',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let axis = parseInt(action.options.axis)
				let name = await self.parseVariablesInString(action.options.name)
				let id = await self.parseVariablesInString(action.options.id)

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
				if (axisObj) {
					axisObj.axisName = name
					axisObj.axisId = id
				}

				//if no mapping, create one
				if (!axisObj) {
					self.MAPPING?.axes.push({ axisIndex: axis, axisName: name, axisId: id })
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.onDisconnectButton = {
			name: 'Other Settings - Button Behavior On Disconnect',
			description: 'Change the behavior of the specific button when the controller is disconnected.',
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
				{
					type: 'dropdown',
					label: 'On Disconnect',
					id: 'disconnect',
					default: 'hold',
					choices: [
						{ id: 'reset', label: 'Reset Value to 0' },
						{ id: 'hold', label: 'Hold Last Values' },
						{ id: 'custom', label: 'Custom Value' },
					],
				},
				{
					type: 'textinput',
					label: 'Custom Value',
					id: 'customValue',
					default: '0',
					useVariables: true,
					isVisible: (options) => options.disconnect == 'custom',
				},
				{
					type: 'dropdown',
					label: 'Button Behavior',
					id: 'buttonBehavior',
					default: 'pressed',
					choices: [
						{ id: 'pressed', label: 'Pressed' },
						{ id: 'released', label: 'Released' },
					],
				},
			],
			callback: async (action) => {
				let button = parseInt(action.options.button)
				let disconnect = action.options.disconnect
				let customValue = await self.parseVariablesInString(action.options.customValue)
				let buttonBehavior = action.options.buttonBehavior

				let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === button)
				if (buttonObj) {
					buttonObj.disconnectBehavior = disconnect
					buttonObj.disconnectCustomValue = customValue
					buttonObj.buttonBehavior = buttonBehavior
				}

				//if no mapping, create one
				if (!buttonObj) {
					self.MAPPING?.buttons.push({
						buttonIndex: button,
						disconnectBehavior: disconnect,
						disconnectCustomValue: customValue,
						buttonBehavior: buttonBehavior,
					})
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		actions.onDisconnectAxis = {
			name: 'Other Settings - Axis Behavior On Disconnect',
			description: 'Change the behavior of the specific axis when the controller is disconnected.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'dropdown',
					label: 'On Disconnect',
					id: 'disconnect',
					default: 'hold',
					choices: [
						{ id: 'reset', label: 'Reset Value to 0' },
						{ id: 'hold', label: 'Hold Last Values' },
						{ id: 'custom', label: 'Custom Value' },
					],
				},
				{
					type: 'textinput',
					label: 'Custom Value',
					id: 'customValue',
					default: '0',
					useVariables: true,
					isVisible: (options) => options.disconnect == 'custom',
				},
			],
			callback: async (action) => {
				let axis = parseInt(action.options.axis)
				let disconnect = action.options.disconnect

				let customValue = await self.parseVariablesInString(action.options.customValue)

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)

				if (axisObj) {
					axisObj.disconnectBehavior = disconnect
					axisObj.disconnectCustomValue = customValue
				}

				//if no mapping, create one
				if (!axisObj) {
					self.MAPPING?.axes.push({
						axisIndex: axis,
						disconnectBehavior: disconnect,
						disconnectCustomValue: customValue,
					})
				}

				//save the mapping to the config table
				self.config.MAPPING = self.MAPPING
				self.config.buttonMapping = 'custom'
				self.saveConfig(self.config)
				self.checkFeedbacks()
				self.checkVariables()
			},
		}

		//set button and axis values to custom value and custom percent
		actions.setButtonValue = {
			name: 'Other Settings - Set Button Value',
			description:
				'Set the value of a specific button on the controller. This can be useful if the button is not behaving as expected.',
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let uuid = self.CONTROLLER.uuid
				let buttonIndex = parseInt(button)
				let pressed = value > 0 ? true : false
				let touched = value > 0 ? true : false
				let val = Number(await self.parseVariablesInString(action.options.value))

				//ensure is number and is between 0 and 1
				if (isNaN(value)) {
					val = 0
				}

				if (value < 0) {
					val = 0
				}

				if (value > 1) {
					val = 1
				}

				let pct = val * 100

				if (uuid) {
					self.processButtonEvent(uuid, buttonIndex, pressed, touched, val, pct)
				}
			},
		}

		actions.setButtonPercent = {
			name: 'Other Settings - Set Button Percent',
			description:
				'Set the percentage of a specific button on the controller. This can be useful if the button is not behaving as expected.',
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
				{
					type: 'textinput',
					label: 'Percent',
					id: 'percent',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let uuid = self.CONTROLLER.uuid
				let buttonIndex = parseInt(button)
				let pressed = value > 0 ? true : false
				let touched = value > 0 ? true : false
				let pct = Number(await self.parseVariablesInString(action.options.percent))

				//ensure is number and is between 0 and 100
				if (isNaN(pct)) {
					pct = 0
				}

				if (pct < 0) {
					pct = 0
				}

				if (pct > 100) {
					pct = 100
				}

				let val = pct / 100

				if (uuid) {
					self.processButtonEvent(uuid, buttonIndex, pressed, touched, val, pct)
				}
			},
		}

		actions.setAxisValue = {
			name: 'Other Settings - Set Axis Value',
			description:
				'Set the value of a specific axis on the controller. This can be useful if the axis is not behaving as expected.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let uuid = self.CONTROLLER.uuid
				let axisIndex = parseInt(axis)
				let val = Number(await self.parseVariablesInString(action.options.value))

				//ensure is number and is between -1 and 1
				if (isNaN(val)) {
					val = 0
				}

				if (val < -1) {
					val = -1
				}

				if (val > 1) {
					val = 1
				}

				if (uuid) {
					self.processAxisEvent(uuid, axisIndex, val)
				}
			},
		}

		actions.setAxisPercent = {
			name: 'Other Settings - Set Axis Percent',
			description:
				'Set the percentage of a specific axis on the controller. This can be useful if the axis is not behaving as expected.',
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
				{
					type: 'textinput',
					label: 'Percent',
					id: 'percent',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let uuid = self.CONTROLLER.uuid
				let axisIndex = parseInt(axis)
				let pct = Number(await self.parseVariablesInString(action.options.percent))

				//ensure is number and is between -100 and 100
				if (isNaN(pct)) {
					pct = 0
				}

				if (pct < -100) {
					pct = -100
				}

				if (pct > 100) {
					pct = 100
				}

				let val = pct / 100

				if (uuid) {
					self.processAxisEvent(uuid, axisIndex, val)
				}
			},
		}

		//load custom mapping from file
		actions.loadCustomMapping = {
			name: 'Other Settings - Load Custom Mapping',
			description: 'Load a custom button/axis mapping from a file.',
			options: [
				{
					type: 'textinput',
					label: 'File Path',
					id: 'path',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let path = await self.parseVariablesInString(action.options.path)

				if (path) {
					self.loadCustomMapping(path)

					//save it to the config for next time
					self.config.buttonMapping = 'custom-file'
					self.config.customFile = path
					self.saveConfig(self.config)
				}
			},
		}

		//save custom mapping to file
		actions.saveCustomMapping = {
			name: 'Other Settings - Save Custom Mapping',
			description: 'Save the current custom button/axis mapping to a file.',
			options: [
				{
					type: 'textinput',
					label: 'File Path',
					id: 'path',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action) => {
				let path = await self.parseVariablesInString(action.options.path)

				if (path) {
					self.saveCustomMapping(path)
				}
			},
		}

		this.setActionDefinitions(actions)
	},
}
