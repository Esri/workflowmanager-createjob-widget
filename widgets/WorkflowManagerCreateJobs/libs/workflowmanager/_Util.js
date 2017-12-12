///////////////////////////////////////////////////////////////////////////
// Copyright © 2017 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    "dojo/_base/declare"
], function(declare) {
    return declare(null, {
        
        getDojoColor: function (colorArray) {
            colorArray[3] = colorArray[3] / 255;
            return new dojo.Color(colorArray);
        },
        
        convertIdsToString: function (ids) {
            return this.join(ids, ",");
        },
        
        convertToDate: function (dateInt) {
            if (dateInt != null) {
                return new Date(dateInt);
            }
            else {
                return null;
            }
        },
        
        formatJobQueryCSV: function (val) {
            var str = "";
            if (val) {
                if (typeof val == "string") {
                    str = val;
                } else {
                    // assume it's an array
                    try {
                        str = this.join(val, ",");
                    } catch (e) { }
                }
            }
            return str;
        },
               
        join: function (arr, joiner) {
            var str = "";
            if (arr && arr.length > 0) {
                str += arr[0];
                for (var i = 1; i < arr.length; i++) {
                    str += joiner + arr[i];
                }
            }
            return str;
        }
    });
});