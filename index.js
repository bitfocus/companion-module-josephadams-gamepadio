const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const UpgradeScripts = require('./src/upgrades')

const config = require('./src/config')
const actions = require('./src/actions')
const feedbacks = require('./src/feedbacks')
const variables = require('./src/variables')
const presets = require('./src/presets')

const constants = require('./src/constants')
const mappings = require('./src/mappings/mappings')
const api = require('./src/api')
const surface = require('./src/surface')

class gamepadioInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...actions,
			...feedbacks,
			...variables,
			...presets,
			...constants,
			...mappings,
			...api,
			...surface,
		})

		this.STATUS = {
			information: '',
			version: '',
			controlStatus: false,
			controllers: [],
		}

		this.receiveBuffer = ''
	}

	async destroy() {
		if (this.config.useAsSurface) {
			this.CompanionSatellite_Close()
			this.CONTROLLER_SURFACE_UUID = undefined
		}

		this.CONNECTED = false
		this.CONTROLLER = undefined
		this.STATUS = {
			information: '',
			version: '',
			controllers: [],
		}
		this.LAST_BUTTON_PRESSED = -1
		this.DEBOUNCE_TIMER = undefined
		this.MAPPING = {
			axes: [],
			buttons: [],
		}
		this.RECONNECT_INTERVAL = undefined

		this.LOCKED = false

		this.receiveBuffer = ''
	}

	async init(config) {
		this.updateStatus(InstanceStatus.Connecting)
		this.configUpdated(config)
	}

	async configUpdated(config) {
		this.config = config

		if (this.config.verbose) {
			this.log('info', 'Verbose mode enabled. Log entries will contain detailed information.')
		}

		this.updateStatus(InstanceStatus.Connecting)

		this.initConnection()

		this.initActions()
		this.initFeedbacks()
		this.initVariables()
		this.initPresets()

		this.checkFeedbacks()
		this.checkVariables()
	}
}

runEntrypoint(gamepadioInstance, UpgradeScripts)
