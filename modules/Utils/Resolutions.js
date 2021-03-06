// Copyright 2016 Comcast Cable Communications Management, LLC

var Resolutions = {
    "1080": {
        width: 1920,
        height: 1080,
        order: 7
    },
    "fullhd": {
        width: 1920,
        height: 1080,
        order: 7
    },
    "720": {
        width: 1280,
        height: 720,
        order: 6
    },
    "hd": {
        width: 1280,
        height: 720,
        order: 6
    },
    "960": {
        width: 960,
        height: 720,
        order: 5
    },
    // 16:9 resolution first.
    "360": {
        width: 640,
        height: 360,
        order: 4
    },
    "640": {
        width: 640,
        height: 480,
        order: 3
    },
    "vga": {
        width: 640,
        height: 480,
        order: 3
    },
    // 16:9 resolution first.
    "180": {
        width: 320,
        height: 180,
        order: 2
    },
    "320": {
        width: 320,
        height: 240,
        order: 1
    }
};
module.exports = Resolutions;