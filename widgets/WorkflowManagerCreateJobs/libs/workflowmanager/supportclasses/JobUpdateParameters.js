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
        // instance properties
        aoi: null,
        assignedTo: null,
        assignedType: null,
        clearAOI: null,
        clearDueDate: null,
        clearStartDate: null,
        dataWorkspaceId: null,
        description: null,
        dueDate: null,
        jobId: null,
        loi: null,
        name: null,
        ownedBy: null,
        parentJobId: null,
        parentVersion: null,
        percent: null,
        priority: null,
        startDate: null,
        status: null,
        versionName: null
    });
});
