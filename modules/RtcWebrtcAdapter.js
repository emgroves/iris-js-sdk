// Copyright 2016 Comcast Cable Communications Management, LLC

// RtcWebrtcAdapter.js : Javascript code for peerconnection APIs 

var RtcBrowserType = require("./Utils/RtcBrowserType.js");

// Defining the API module 
var RtcWebrtcAdapter = module.exports;

rtcAdapterInit();

// /** 
//  * Peerconnection definition
//  * @param Nothing
//  * @returns 
//  * 
// */
RtcWebrtcAdapter.RTCPeerConnection = webkitRTCPeerConnection ;

// /** 
//  * RTCIceCandidate definition
//  * @param Nothing
//  * @returns 
//  * 
// */
RtcWebrtcAdapter.RTCIceCandidate = RTCIceCandidate ;

// /** 
//  * getUserMedia definition
//  * @param Nothing
//  * @returns 
//  * 
// */
RtcWebrtcAdapter.getUserMedia = ( typeof(navigator) !== 'undefined' ) ? navigator.webkitGetUserMedia.bind(navigator) : null;


function rtcAdapterInit() {
    var navigator = ( typeof(navigator) !== 'undefined' ) ? navigator : null;
    if (navigator && RtcBrowserType.isChrome()) {
        RtcWebrtcAdapter.RTCPeerConnection = webkitRTCPeerConnection;
        RtcWebrtcAdapter.RTCIceCandidate = RTCIceCandidate;
        RtcWebrtcAdapter.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
    } else if (navigator && RtcBrowserType.isFirefox()) {
        RtcWebrtcAdapter.RTCPeerConnection = mozRTCPeerConnection;
        RtcWebrtcAdapter.RTCIceCandidate = mozRTCIceCandidate;
        RtcWebrtcAdapter.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
    }
}
