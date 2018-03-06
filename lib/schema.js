const initSchema = {
    type: 'object',
    properties: {
        host: {
            type: 'string'
        },
        port: {
            anyOf: [
                {
                    type: [
                        'integer',
                        'string'
                    ]
                }
            ]
        },
        protocol: {
            type: 'string',
            default: 'http'
        }
    },
    required: [
        'host',
        'port'
    ]
};

module.exports = {
    initSchema
}; 
