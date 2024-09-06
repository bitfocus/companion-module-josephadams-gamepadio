module.exports = {
	//module defaults
	CONNECTED: false,
	CONTROLLER: undefined,
	STATUS: {
		information: '',
		version: '',
		controllers: [],
	},

	LAST_BUTTON_PRESSED: -1,
	DEBOUNCE_TIMER: undefined,
	MAPPING: undefined,

	RECONNECT_INTERVAL: undefined,

	LOCKED: false,

	CHOICES_CONTROLLERS: [{ id: '0', label: 'Controller 1' }],
	CHOICES_BUTTONS: [{ id: '0', label: 'Button 1' }],
	CHOICES_AXES: [{ id: '0', label: 'Axis 1' }],

	CHOICES_HAPTIC_TYPES: [
		{ id: 'dual-rumble', label: 'Dual Rumble' },
		{ id: 'trigger-rumble', label: 'Trigger Rumble' },
	],
}
