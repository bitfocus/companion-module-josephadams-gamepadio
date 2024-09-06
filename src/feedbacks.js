const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function () {
		let self = this

		let feedbacks = {}

		const colorWhite = combineRgb(255, 255, 255) // White
		const colorRed = combineRgb(255, 0, 0) // Red

		feedbacks.controllerConnected = {
			type: 'boolean',
			label: 'Controller Connected',
			description: 'If a controller is connected, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			callback: async function () {
				if (self.CONTROLLER) {
					return true
				}
			},
		}

		feedbacks.controllerLocked = {
			type: 'boolean',
			label: 'Controller Locked',
			description: 'If the controller is locked by Companion, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			callback: async function () {
				return self.LOCKED
			},
		}

		feedbacks.buttonPressed = {
			type: 'boolean',
			name: 'Controller Button is Pressed',
			description: 'If the controller button is pressed, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
			],
			callback: async function (feedback) {
				let opt = feedback.options

				let controller = self.CONTROLLER

				if (!controller) {
					return false
				}

				let button = controller.buttons[parseInt(feedback.options.button)]
				if (!button) {
					return false
				}

				return button.pressed || false
			},
		}

		feedbacks.buttonTouched = {
			type: 'boolean',
			name: 'Controller Button is Touched',
			description: 'If the controller button is touched, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
			],
			callback: async function (feedback) {
				let opt = feedback.options

				let controller = self.CONTROLLER

				if (!controller) {
					return false
				}

				let button = controller.buttons[parseInt(feedback.options.button)]
				if (!button) {
					return false
				}

				return button.touched || false
			},
		}

		feedbacks.buttonInverted = {
			type: 'boolean',
			name: 'Controller Button is Inverted',
			description: 'If the controller button is inverted, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Button',
					id: 'button',
					default: self.CHOICES_BUTTONS[0].id,
					choices: self.CHOICES_BUTTONS,
				},
			],
			callback: async function (feedback) {
				let opt = feedback.options

				let controller = self.CONTROLLER

				if (!controller) {
					return false
				}

				let buttonObj = self.MAPPING?.buttons.find((obj) => obj.buttonIndex === i)
				if (buttonObj) {
					return buttonObj.buttonInverted
				}

				return false
			},
		}

		feedbacks.axisInverted = {
			type: 'boolean',
			name: 'Controller Axis is Inverted',
			description: 'If the controller axis is inverted, change the color of the button',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Axis',
					id: 'axis',
					default: self.CHOICES_AXES[0].id,
					choices: self.CHOICES_AXES,
				},
			],
			callback: async function (feedback) {
				let opt = feedback.options

				let controller = self.CONTROLLER

				if (!controller) {
					return false
				}

				let axisObj = self.MAPPING?.axes.find((obj) => obj.axisIndex === axis)
				if (axisObj) {
					return axisObj.axisInverted
				}

				return false
			},
		}

		self.setFeedbackDefinitions(feedbacks)
	},
}
