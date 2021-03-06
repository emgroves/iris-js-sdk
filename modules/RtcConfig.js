// Copyright 2016 Comcast Cable Communications Management, LLC

// RtcConfig.js : Javascript code for storing config

// Defining the API module  
var RtcConfig = module.exports;

// Config json
RtcConfig.json = {
    urls: {
        /*PROD URLs*/
        /*appServer: '',
        authManager: '',
        idManager: '',
        eventManager: '',
        notificationManager: '',*/

        /*Stats Server*/
        UEStatsServer: '',
    },
    pingInterval: 120000,
    presInterval: 10000,
    reconnectInterval: 10000,
    statsInterval: 10000,
    useAutoAnswer: true,
    useBridge: true, // for p2p flow, set this to false
    useEmPrivateIQ: false, // whether to send private IQ or call event manager directly for createxmpprootevent
    logLevel: 2, // 0: Error, 1: Warning, 2: Info, 3: Verbose

    /* Provide keys for domain*/
    /* PROD keys */
    appKey: '',
    appSecret: '',


    authMgrPath: '/v1/login/',
    audioForSessions: true,
    sdkVersion: '3.3.0',
}

/**
 * Go through the config
 * API to update config through API
 * @param {userConfig} Config
 */
RtcConfig.updateConfig = function updateConfig(userConfig) {

    // Go through hashmap
    for (key in userConfig) {
        RtcConfig.json[key] = userConfig[key];
    }
}


console.log("JS SDK Version : " + RtcConfig.json.sdkVersion);