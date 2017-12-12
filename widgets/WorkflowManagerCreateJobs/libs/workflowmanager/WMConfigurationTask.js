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
    "dojo/_base/declare",
    "dojo/_base/lang",
    "./_BaseTask",
    "./_Util"
], function(declare, lang, BaseTask, Util) {
    return declare([BaseTask], {
        constructor: function (url) {
            this.url = url;
            this.disableClientCaching = true;
        },
        getServiceInfo: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "", successCallBack, errorCallBack);
        },
        getJobTypeDetails: function (jobTypeId, successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/jobTypes/" + jobTypeId, function (response) {
                var util = new Util();
                response.defaultStartDate = util.convertToDate(response.defaultStartDate);
                response.defaultDueDate = util.convertToDate(response.defaultDueDate);
                successCallBack(response);
            }, errorCallBack);
        },

        getVisibleJobTypes: function (user, successCallBack, errorCallBack) {
            var params = {};
            params.user = this.formatDomainUsername(user);
            this.sendRequest(params, "/visibleJobTypes", function (response) {
                var util = new Util();
                response.defaultStartDate = util.convertToDate(response.defaultStartDate);
                response.defaultDueDate = util.convertToDate(response.defaultDueDate);
                successCallBack(response);
            }, errorCallBack);
        },

        getDataWorkspaceDetails: function (dataWorkspaceId, user, successCallBack, errorCallBack) {
            var self = lang.hitch(this);
            // Try the 10.1+ operation first
            var params = {};
            params.user = this.formatDomainUsername(user);
            this.sendRequest(params, "/dataWorkspaces/" + dataWorkspaceId + "/info", successCallBack, function(err) {
                // Fallback to the 10.0 resource
                //  (which does not support data workspaces with individual logins)
                self.sendRequest(params, "/dataWorkspaces/" + dataWorkspaceId, successCallBack, errorCallBack);
            });
        },
        getTableRelationshipsDetails: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/tableRelationships", function (response) {
                successCallBack(response.tableRelationships);
            }, errorCallBack);
        },
        getPublicJobQueryDetails: function (queryId, successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/publicQueries/" + queryId, successCallBack, errorCallBack);
        },
        getUserJobQueryDetails: function (username, queryId, successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/community/users/" + this.formatDomainUsername(username) + "/queries/" + queryId, successCallBack, errorCallBack);
        },
        getAllUsers: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/community/users", function (response) {
                successCallBack(response.users);
            }, errorCallBack);
        },
        getUser: function (username, successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/community/users/" + this.formatDomainUsername(username), successCallBack, errorCallBack);
        },
        getAllGroups: function (successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/community/groups", function (response) {
                successCallBack(response.groups);
            }, errorCallBack);
        },
        getGroup: function (groupId, successCallBack, errorCallBack) {
            var params = {};
            this.sendRequest(params, "/community/groups/" + groupId, successCallBack, errorCallBack);
        }
    });
});
