module.exports =  {
	// Button Mapping choices shown in the module config - any choice added here should have a corresonding json file with the same name as the id, in the mappings folder.
	CHOICES_BUTTONMAPPING: [
		{ id: undefined, label: '(select a button mapping)' },
		{ id: 'generic', label: 'Generic' },
		{
			id: 'custom',
			label: 'Custom (Start with Generic, then use Actions to define each Button Name, variableId, etc.)',
		},
		{ id: 'custom-file', label: 'Custom (Load from File)' },
		{ id: 'xbox360', label: 'XBox 360' },
		{ id: 'xboxone', label: 'XBox One' },
		{ id: 'ps4', label: 'PS4' },
	],
}