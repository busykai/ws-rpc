/*
 * Copyright (c) 2015 Intel Corporation. All rights reserved.
 *
 * See LICENSE for full license text.
 */
/*global module: false */
(function () {
    "use strict";
    
    /* Simple call serializer */
    function Deferred() {
    }
    
    Deferred.prototype = {
        _next: undefined,
        then: function (next) {
            this._next = next;
        },
        done: function () {
            if (this._next) {
                return this._next();
            }
        }
    };
    
    module.exports = Deferred;
    
}());
