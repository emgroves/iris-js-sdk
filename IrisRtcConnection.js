// Copyright 2016 Comcast Cable Communications Management, LLC

// IrisRtcConnection.js : Javascript code for establishing connection with backend
//                        The input to the connection is the public id as provided
//                        in the register API.
//


// Defining the API module 
module.exports = IrisRtcConnection;

// Import the modules
var logger = require('./modules/RtcLogger.js');
var errors = require('./modules/RtcErrors.js');
var config = require('./modules/RtcConfig.js');
var https = require('https');
var xmpp = require('./modules/RtcXmpp.js');

// States
["DISCONNECTED", "CONNECTED"].forEach(function each(state, index) {
    IrisRtcConnection.prototype[state] = IrisRtcConnection[state] = index;
});

/**
 * Constructor for IrisRtcConnection<br/>
 * This class maintains APIs required for creating and maintaining connection with rtc server.
 * @constructor
 */
function IrisRtcConnection() {
    if (this instanceof IrisRtcConnection === false) {
        throw new TypeError("Classes can't be function-called");
    }

    logger.log(logger.level.INFO, "IrisRtcConnection",
        " Constructor ");

    this.token = null; // Variable to store the JWT token
    this.userID = null; // Variable to store the userid token
    this.xmpptoken = null; // Variable to store xmpp token
    this.xmpptokenExpiry = null; // Variable to store expiry
    this.xmppServer = null; // Variable to store the XMPP server name
    this.traceId = null;
    this.state = IrisRtcConnection.DISCONNECTED;
    this.xmpp = null; // Variable to store instance of websocket connection
    this.publicId = null;
    this.type = null;
    this.domain = null;
    this.iceServerJson = null;
    this.myJid = null;
    this.errorDetails = null;
    this.irisUserId = null;
    this.subscriberId = null;
    this.turnCredentialExpiry = null;

}

/**
 * This method is called to create a connection with websocket server. It takes routingId of the user and iris token
 * as parameters, this method makes a call to event manager's API <code>/v1/wsturnserverinfo/routingid/:routingid</code>
 * to get <code>websocket_server</code>, <code>websocket_server_token</code>, <code>websocket_server_token_expiry_time</code> and <code>turn_credentials</code> details.<br/>
 *
 * Establishes a web socket connection with the rtc server for the user with routingId.<br/>
 * 
 * @param {string} irisToken - Authorisation token or iris token is obtained from Auth manager by providing media token and authentication type 
 * @param {string} routingId - Unique participant Id of user. It is obtained from application server
 */
IrisRtcConnection.prototype.connect = function(irisToken, routingId) {

    if (!irisToken || !routingId) {
        logger.log(logger.level.ERROR, "IrisRtcConnection", "irisToken and routingId are required to create a connection");
        return;
    } else {

        logger.log(logger.level.INFO, "IrisRtcConnection",
            " connect :: get xmpp details for routingId  " + routingId +
            " token " + irisToken);

    }

    var self = this;

    self.userID = routingId;
    self.token = "Bearer " + irisToken;

    if (self._getWSTurnServerInfo(self.token, self.userID) < 0) {
        logger.log(logger.level.ERROR, "IrisRtcConnection",
            "  Connection with XMPP server failed with error");
        self.onError(new Error("Connection with XMPP server failed"));
    }
};

/**
 * API to disconnet from the rtc server connection
 */
IrisRtcConnection.prototype.close = function() {
    logger.log(logger.level.INFO, "IrisRtcConnection",
        " close ");

    if (this.xmpp) {
        this.xmpp.removeAllListeners();
        this.xmpp.disconnect();
        this.xmpp = null;
    }

    this.token = null; // Variable to store the JWT token
    this.userID = null; // Variable to store the userid token
    this.xmpptoken = null; // Variable to store xmpp token
    this.xmpptokenExpiry = null; // Variable to store expiry
    this.xmppServer = null; // Variable to store the XMPP server name
    this.traceId = null;
    this.state = IrisRtcConnection.DISCONNECTED;
    this.xmpp = null; // Variable to store instance of websocket connection
    this.publicId = null;
    this.type = null;
    this.domain = null;
    this.iceServerJson = null;
    this.myJid = null;
}

/**
 * Function to retrieve XMPP server details
 * 
 * @param {token} token for authorization
 * @param {RoutingId} Routing id
 * @returns {retValue} 0 on success, negative value on error
 * @private
 */
IrisRtcConnection.prototype._getWSTurnServerInfo = function(token, routingId) {
    // Error checking
    if (!config.json.urls.eventManager ||
        !token ||
        !routingId) {
        logger.log(logger.level.ERROR, "IrisRtcConnection",
            " Incorrect parameters");
        return errors.code.ERR_INCORRECT_PARAMETERS;
    }

    // Options for wsturnserverinfo request
    var options = {
        host: config.json.urls.eventManager,
        path: '/v1/wsturnserverinfo/routingid/' + routingId,
        method: 'GET',
        headers: { "Authorization": token }
    };

    logger.log(logger.level.VERBOSE, "IrisRtcConnection",
        " Getting xmpp server details " +
        " with options " + JSON.stringify(options));

    var self = this;

    // Create a try and catch block
    try {
        // Send the http request and wait for response
        var req = https.request(options, function(response) {
            var body = ''

            // Callback for data
            response.on('data', function(chunk) {
                body += chunk;
            });

            // Callback when complete data is received
            response.on('end', function() {
                logger.log(logger.level.INFO, "IrisRtcConnection",
                    " Received server response  " + body);

                // check if the status code is correct
                if (response.statusCode != 200) {
                    logger.log(logger.level.ERROR, "IrisRtcConnection",
                        " Getting xmpp server details failed with status code  " +
                        response.statusCode + " & response " + body);

                    if (response.statusCode == '503' || response.statusCode == '404') {
                        self._doreconnect();
                        return;
                    } else
                        return errors.code.ERR_INVALID_STATE;
                }

                // Get the the response json
                var resJson = JSON.parse(body);
                // workaround
                if (!resJson.Rtc_server) {
                    resJson.Rtc_server = resJson.websocket_server;
                    resJson.Xmpp_token = resJson.websocket_server_token;
                    resJson.Xmpp_token_expiry_time = resJson.websocket_server_token_expiry_time;
                    resJson.Turn_credentials = resJson.turn_credentials
                }
                // Check if we have all the data
                if (!resJson.Rtc_server || !resJson.Xmpp_token || !resJson.Xmpp_token_expiry_time) {
                    logger.log(logger.level.ERROR, "IrisRtcConnection",
                        " Getting xmpp server details failed as didnt receive all the parameters  ");
                    return errors.code.ERR_INVALID_STATE;

                }

                // Store the data for next time
                if (config.json.useXmppServer) {
                    self.xmppServer = config.json.useXmppServer;
                } else {
                    self.xmppServer = resJson.Rtc_server;
                }
                self.xmpptoken = resJson.Xmpp_token;
                self.xmpptokenExpiry = resJson.Xmpp_token_expiry_time;

                logger.log(logger.level.VERBOSE, "IrisRtcConnection",
                    " Ice server details are  " + resJson.Turn_credentials);

                self.iceServerJson = resJson.Turn_credentials;

                var json = JSON.parse(self.iceServerJson);
                if (json && json.ttl) {
                    var currTime = (Math.floor(Date.now() / 1000));
                    self.turnCredentialExpiry = currTime + json.ttl;

                    logger.log(logger.level.INFO, "IrisRtcConnection",
                        " self.xmpptokenExpiry " + self.xmpptokenExpiry +
                        " self.turnCredentialExpiry " + self.turnCredentialExpiry);
                }

                // XMPP token received, make a call to XMPP server and stay connected
                self._connectXmpp(self.xmpptoken, self.xmppServer, self.xmpptokenExpiry);
            });
        });

        // Catch errors 
        req.on('error', function(e) {
            logger.log(logger.level.ERROR, "IrisRtcConnection",
                " Getting xmpp server details failed with error  " + e);
            self.onError(e);
        });

        // Write json
        req.end();

    } catch (e) {
        logger.log(logger.level.ERROR, "IrisRtcConnection",
            "Getting xmpp server details with error  " + e);
        self.onError(e);
    }

    return 0; // Success
}

/**
 * Function to connect to XMPP server
 * @param {xmpptoken} token for xmpp server
 * @param {xmppServer} Xmpp server url
 * @returns {retValue} 0 on success, negative value on error
 * @private
 */
IrisRtcConnection.prototype._connectXmpp = function(xmpptoken, xmppServer, tokenExpiry) {

    logger.log(logger.level.INFO, "IrisRtcConnection",
        " Connecting to Xmpp server at  " + xmppServer +
        " with token " + xmpptoken + " & RoutingId " + this.userID);

    // Parameter checking
    if (!xmpptoken ||
        !xmppServer) {
        logger.log(logger.level.ERROR, "IrisRtcConnection Connect Xmpp ",
            " Incorrect parameters");
        return errors.code.ERR_INCORRECT_PARAMETERS;
    }

    // Call websocket module for connection
    if (this.xmpp == null) {
        this.xmpp = new xmpp();

        // Assign self
        var self = this;

        // Monitor onopen method
        this.xmpp.on('onOpen', function(jid) {
            logger.log(logger.level.INFO, "IrisRtcConnection",
                " onOpened");
            self.state = IrisRtcConnection.CONNECTED;
            self.myJid = jid.toString();
            self.onOpen();
            self.sendEvent("SDK_XMPPServerConnected", "");
        });

        // Monitor onclose method
        this.xmpp.on('onClose', function() {
            logger.log(logger.level.INFO, "IrisRtcConnection",
                " onClosed");
            self.state = IrisRtcConnection.DISCONNECTED;
            self.onClose();
            self.sendEvent("SDK_XMPPServerDisconnected", "");

            // do reconnect
            self._doreconnect();
        });
        // Monitor onmessage method
        this.xmpp.on('onMessage', function(data, flags) {
            logger.log(logger.level.INFO, "IrisRtcConnection",
                " onMessage " + data);
            self.onMessage(data, flags);
        });

        // Monitor onError method
        this.xmpp.on('onError', function(e) {
            logger.log(logger.level.INFO, "IrisRtcConnection",
                " onError " + e);
            self.sendEvent("SDK_Error", e.toString());
            self.state = IrisRtcConnection.DISCONNECTED;
            self.onError(e);
        });

        // Add a listener to incoming to calls
        this.xmpp.on('onIncoming', function(response) {
            logger.log(logger.level.VERBOSE, "IrisRtcConnection",
                " onIncoming " + JSON.stringify(response));
            var userdata = null;
            var config;
            // Check if we have userdata
            if (response.userdata) {
                try {
                    userdata = JSON.parse(response.userdata);
                    logger.log(logger.level.VERBOSE, "IrisRtcConnection",
                        " onIncoming userdata " + JSON.stringify(userdata)
                    );
                    if (userdata.notification.type == 'pstn') {
                        userdata.notification.type = 'audio';
                    }

                } catch (e) {
                    logger.log(logger.level.ERROR, "IrisRtcConnection", " onIncoming JSON parse failed");
                }
            }
            if (userdata) {
                config = response;
                config.userdata = userdata;
                config.sessionType = "join";
                config.anonymous = false;
                self.onNotification(config);
            }
        });
    }

    //wss://ma-xmpp-as-a-001.rtc.sys.comcast.net/xmpp-websocket/
    //routingid/6b9c6752-d8c5-4d9f-8c2a-c5cf913cb670@share.comcast.net/mucid/28ce36d0-598e-11e6-b9d5-05ba3d7a5b9d/
    //timestamp/1470350578/token/9b458a188213a6b61d492069d1391a29305f799b/traceid/B6903791-690C-4F31-A7D0-5BA77F4B0BA6
    var path = "/xmpp-websocket/routingid/" + this.userID + "/timestamp/" +
        tokenExpiry + "/token/" + this.xmpptoken; //+ "/traceid/" + this.traceId;

    // Call connect method
    this.xmpp.connect(xmppServer, path, this.userID, this.traceId, this.token);
}

/**
 * Function to reconnect connection
 * @private
 */
IrisRtcConnection.prototype._doreconnect = function() {
    var self = this;

    var delay;
    if (!config.json.reconnectInterval) {
        delay = 10000;
    } else {
        delay = config.json.reconnectInterval;
    }

    // Check if we are already connected
    if (this.state == IrisRtcConnection.CONNECTED) {
        // Check if we still have a valid xmpp token
        logger.log(logger.level.INFO, "IrisRtcConnection",
            " Already connected !!!");
        return 0;
    }

    setTimeout(function() {
        logger.log(logger.level.INFO, "IrisRtcConnection",
            " doreconnect::Reconnecting...");

        // Check if we still have a valid xmpp token
        logger.log(logger.level.INFO, "IrisRtcConnection",
            " this.xmpptokenExpiry " + self.xmpptokenExpiry +
            " Date.now() " + Math.floor(Date.now() / 1000));
        if (self.xmpptokenExpiry > (Math.floor(Date.now() / 1000))) {
            logger.log(logger.level.INFO, "IrisRtcConnection",
                " Found a valid token");

            // XMPP token received, make a call to XMPP server and stay connected
            self._connectXmpp(self.xmpptoken, self.xmppServer, self.xmpptokenExpiry);
            return 0;
        }

    }, delay);
}

/**
 * Called when websocket is opened
 * @private
 */
IrisRtcConnection.prototype.onOpen = function() {
    this.onConnected();
}

/**
 * Callback for websocket is disconnection
 */
IrisRtcConnection.prototype.onClose = function() {
    // this.onDisconnected();
}

/**
 * Called when websocket has a message
 * @private
 */
IrisRtcConnection.prototype.onMessage = function(data, flags) {}

/**
 * Called when websocket has a error
 * @private
 */
IrisRtcConnection.prototype.onError = function(e) {
    this.onConnectionFailed(e);
}

/**
 * Called when connection has an event
 * @private
 */
IrisRtcConnection.prototype.sendEvent = function(state, details) {
    var eventdata = { "type": "connection", "state": state, "details": details };
    this.onEvent(eventdata);
}

/**
 * Called when connection has an event
 */
IrisRtcConnection.prototype.onEvent = function(event) {

}

/**
 * Called when websocket is connection is established
 */
IrisRtcConnection.prototype.onConnected = function() {
    // Same as onOpen
}

/**
 *  Called when websocket has a error
 */
IrisRtcConnection.prototype.onConnectionFailed = function(e) {
    // Same as onError
}

/**
 * This callback is called when an incoming call notification is received and
 * notifies client about the incoming call and passes notification information received.
 * @param {json} notificationInfo - Notfication payload received from the remote participant
 */
IrisRtcConnection.prototype.onNotification = function(notificationInfo) {

}