module.exports = {
	initVariables: function () {
		let self = this

		let variables = []

		variables.push({ variableId: 'connected', name: 'Connected to gamepad-io' })
		variables.push({ variableId: 'information', name: 'Information' })
		variables.push({ variableId: 'version', name: 'gamepad-io Version' })

		variables.push({ variableId: 'use_as_surface', name: 'Use as Surface On/Off' })

		if (self.config.useAsSurface) {
			variables.push({ variableId: 'haptic_when_pressed', name: 'Haptic When Button Pressed' })

			variables.push({ variableId: 'button_press_threshold', name: 'Button Press Threshold (%)' })
			variables.push({ variableId: 'button_release_threshold', name: 'Button Release Threshold (%)' })
			variables.push({ variableId: 'button_debounce', name: 'Button Debounce (ms)' })
			variables.push({ variableId: 'axis_button_press', name: 'Axis will Button Press' })
			variables.push({ variableId: 'axis_movement_threshold', name: 'Axis Movement Threshold (%)' })
		}

		variables.push({ variableId: `controller_connected`, name: `Controller Connected` })

		if (self.CONTROLLER) {
			variables.push({ variableId: `controller_locked`, name: `Controller Locked` })
			variables.push({ variableId: `controller_uuid`, name: `Controller UUID` })
			variables.push({ variableId: `controller_id`, name: `Controller ID` })
			variables.push({ variableId: `controller_name`, name: `Controller Name` })
			variables.push({ variableId: `controller_total_buttons`, name: `Controller Total Buttons` })
			variables.push({ variableId: `controller_total_axes`, name: `Controller Total Axes` })

			if (self.CONTROLLER.buttons) {
				for (let j = 0; j < self.CONTROLLER.buttons.length; j++) {
					let buttonId = j //generic
					let buttonName = j //generic

					let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === j)

					if (buttonObj) {
						buttonId = buttonObj.buttonId
						buttonName = buttonObj.buttonName || buttonObj.buttonIndex
					}

					variables.push({ variableId: `button_${buttonId}_pressed`, name: `Button ${buttonName} Pressed` })
					variables.push({ variableId: `button_${buttonId}_touched`, name: `Button ${buttonName} Touched` })
					variables.push({ variableId: `button_${buttonId}_val`, name: `Button ${buttonName} Raw Value` })
					variables.push({ variableId: `button_${buttonId}_val_abs`, name: `Button ${buttonName} Raw Value Absolute` })
					variables.push({ variableId: `button_${buttonId}_val_display`, name: `Button ${buttonName} Display Value` })
					variables.push({
						variableId: `button_${buttonId}_val_display_abs`,
						name: `Button ${buttonName} Display Value Absolute`,
					})
					variables.push({ variableId: `button_${buttonId}_pct`, name: `Button ${buttonName} Percent` })
					variables.push({ variableId: `button_${buttonId}_pct_abs`, name: `Button ${buttonName} Percent Absolute` })

					variables.push({ variableId: `button_${buttonId}_type`, name: `Button ${buttonName} Type` })
					variables.push({ variableId: `button_${buttonId}_inverted`, name: `Button ${buttonName} Inverted` })

					//range display
					variables.push({
						variableId: `button_${buttonId}_range_display_min`,
						name: `Button ${buttonName} Range Display Min`,
					})
					variables.push({
						variableId: `button_${buttonId}_range_display_max`,
						name: `Button ${buttonName} Range Display Max`,
					})
				}
			}

			if (self.CONTROLLER.axes) {
				for (let j = 0; j < self.CONTROLLER.axes.length; j++) {
					let axisId = j
					let axisName = j

					let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === j)

					if (axisObj) {
						axisId = axisObj.axisId
						axisName = axisObj.axisName
					}

					variables.push({ variableId: `axis_${axisId}_pressed`, name: `Axis ${axisName} Pressed` })
					variables.push({ variableId: `axis_${axisId}_val`, name: `Axis ${axisName} Raw Value` })
					variables.push({ variableId: `axis_${axisId}_val_abs`, name: `Axis ${axisName} Raw Value Absolute` })
					variables.push({ variableId: `axis_${axisId}_val_display`, name: `Axis ${axisName} Display Value` })
					variables.push({
						variableId: `axis_${axisId}_val_display_abs`,
						name: `Axis ${axisName} Display Value Absolute`,
					})
					variables.push({ variableId: `axis_${axisId}_pct`, name: `Axis ${axisName} Percent` })
					variables.push({ variableId: `axis_${axisId}_pct_abs`, name: `Axis ${axisName} Percent Absolute` })

					variables.push({ variableId: `axis_${axisId}_direction`, name: `Axis ${axisName} Current Direction` })

					variables.push({ variableId: `axis_${axisId}_type`, name: `Axis ${axisName} Type` })
					variables.push({ variableId: `axis_${axisId}_inverted`, name: `Axis ${axisName} Inverted` })

					//range display
					variables.push({ variableId: `axis_${axisId}_range_display_min`, name: `Axis ${axisName} Range Display Min` })
					variables.push({ variableId: `axis_${axisId}_range_display_max`, name: `Axis ${axisName} Range Display Max` })

					//deadzones
					variables.push({ variableId: `axis_${axisId}_neg_deadzone`, name: `Axis ${axisName} Negative Deadzone` })
					variables.push({ variableId: `axis_${axisId}_pos_deadzone`, name: `Axis ${axisName} Positive Deadzone` })
				}
			}
		}

		self.setVariableDefinitions(variables)
	},

	checkVariables: function () {
		let self = this

		try {
			let variableObj = {}

			variableObj['connected'] = self.CONNECTED ? 'True' : 'False'
			variableObj['information'] = self.STATUS.information
			variableObj['version'] = self.STATUS.version

			//module config variables
			variableObj['use_as_surface'] = self.config.useAsSurface ? 'On' : 'Off'

			variableObj['controller_connected'] = self.CONTROLLER ? 'True' : 'False'

			if (self.config.useAsSurface) {
				variableObj['haptic_when_pressed'] = self.config.hapticWhenPressed ? 'On' : 'Off'

				variableObj['button_press_threshold'] = self.config.buttonPressThreshold + '%'
				variableObj['button_release_threshold'] = self.config.buttonReleaseThreshold + '%'
				variableObj['button_debounce'] = self.config.buttonDebounce

				variableObj['axis_button_press'] = self.config.axisMovementAsButtonPress ? 'On' : 'Off'
				variableObj['axis_movement_threshold'] = self.config.axisMovementPressThreshold + '%'
			}

			let controller = self.CONTROLLER

			if (controller) {
				variableObj[`controller_locked`] = self.LOCKED ? 'On' : 'Off'
				variableObj[`controller_uuid`] = controller.uuid
				variableObj[`controller_id`] = controller.id
				variableObj[`controller_name`] = controller.name
				variableObj[`controller_total_buttons`] = controller.buttons.length
				variableObj[`controller_total_axes`] = controller.axes.length

				for (let i = 0; i < self.CONTROLLER.buttons.length; i++) {
					let buttonId = i //generic
					let buttonName = i //generic
					let buttonType = 'Button'
					let buttonInverted = false
					let buttonRangeMin = -1
					let buttonRangeMax = 1

					let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === i)

					if (buttonObj) {
						buttonId = buttonObj.buttonId
						buttonName = buttonObj.buttonName || buttonObj.buttonIndex
						buttonType = buttonObj.buttonType == 'trigger' ? 'Trigger' : 'Button'
						buttonInverted = buttonObj.buttonInverted
						buttonRangeMin = buttonObj.buttonRangeMin
						buttonRangeMax = buttonObj.buttonRangeMax
					}

					variableObj[`button_${buttonId}_pressed`] = self.CONTROLLER.buttons[i].pressed ? 'True' : 'False'
					variableObj[`button_${buttonId}_touched`] = self.CONTROLLER.buttons[i].touched ? 'True' : 'False'

					variableObj[`button_${buttonId}_val`] = self.CONTROLLER.buttons[i].val || '0'
					variableObj[`button_${buttonId}_val_abs`] = Math.abs(self.CONTROLLER.buttons[i].val || 0)

					variableObj[`button_${buttonId}_val_display`] = self.CONTROLLER.buttons[i].valDisplay || '0'
					variableObj[`button_${buttonId}_val_display_abs`] = Math.abs(self.CONTROLLER.buttons[i].valDisplay || 0)

					variableObj[`button_${buttonId}_pct`] = (self.CONTROLLER.buttons[i].pct || '0') + '%'
					variableObj[`button_${buttonId}_pct_abs`] = Math.abs(self.CONTROLLER.buttons[i].pct || 0) + '%'

					variableObj[`button_${buttonId}_type`] = buttonType || 'Button'
					variableObj[`button_${buttonId}_inverted`] = buttonInverted ? 'On' : 'Off'

					variableObj[`button_${buttonId}_range_display_min`] = buttonRangeMin
					variableObj[`button_${buttonId}_range_display_max`] = buttonRangeMax
				}

				for (let i = 0; i < self.CONTROLLER.axes.length; i++) {
					let axisId = i
					let axisName = i
					let axisType = 'unknown'
					let axisInverted = false
					let axisRangeMin = -1
					let axisRangeMax = 1
					let axisNegDeadzone = 0
					let axisPosDeadzone = 0

					let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === i)

					if (axisObj) {
						axisId = axisObj.axisId
						axisName = axisObj.axisName
						axisType = axisObj.axisType
						axisInverted = axisObj.axisInverted
						axisRangeMin = axisObj.axisRangeMin
						axisRangeMax = axisObj.axisRangeMax
						axisNegDeadzone = axisObj.axisNegDeadzone
						axisPosDeadzone = axisObj.axisPosDeadzone
					}

					variableObj[`axis_${axisId}_pressed`] = self.CONTROLLER.axes[i].pressed ? 'True' : 'False'

					variableObj[`axis_${axisId}_val`] = self.CONTROLLER.axes[i].axis || '0'
					variableObj[`axis_${axisId}_val_abs`] = Math.abs(self.CONTROLLER.axes[i].axis || 0)

					variableObj[`axis_${axisId}_val_display`] = self.CONTROLLER.axes[i].axisDisplayValue || '0'
					variableObj[`axis_${axisId}_val_display_abs`] = Math.abs(self.CONTROLLER.axes[i].axisDisplayValue || 0)

					variableObj[`axis_${axisId}_pct`] = (self.CONTROLLER.axes[i].pct || 0) + '%'
					variableObj[`axis_${axisId}_pct_abs`] = Math.abs(self.CONTROLLER.axes[i].pct || 0) + '%'

					variableObj[`axis_${axisId}_direction`] = self.CONTROLLER.axes[i].direction || ''
					variableObj[`axis_${axisId}_type`] = axisType
					variableObj[`axis_${axisId}_inverted`] = axisInverted || false ? 'On' : 'Off'

					variableObj[`axis_${axisId}_range_display_min`] = axisRangeMin
					variableObj[`axis_${axisId}_range_display_max`] = axisRangeMax

					variableObj[`axis_${axisId}_neg_deadzone`] = axisNegDeadzone
					variableObj[`axis_${axisId}_pos_deadzone`] = axisPosDeadzone
				}
			}

			self.setVariableValues(variableObj)
		} catch (error) {
			self.log('error', 'Error setting Variables: ' + String(error))
		}
	},
}
