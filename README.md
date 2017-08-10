# Workflow Manager Create Job Widget

Sample [ArcGIS Workflow Manager](https://server.arcgis.com/en/workflow-manager/) Create Job widget for [Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/)

## Setup
* Follow [setup instructions for Web AppBuilder for ArcGIS](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
* Clone this repo to your local drive and copy `WorkflowManagerCreateJobs` to `<WebAppBuilderInstallDir>\client\stemapp\widgets` folder
  * e.g. `<WebAppBuilderInstallDir>\client\stemapp\widgets\WorkflowManagerCreateJobs`
* Copy the following directories from `WorkflowManagerCreateJobs` to `<WebAppBuilderInstallDir>\client\stemapp\libs`
  * `WorkflowManagerCreateJobs\exifjs` -> `<WebAppBuilderInstallDir>\client\stemapp\libs\exifjs`
  * `WorkflowManagerCreateJobs\libs\workflowmanager` -> `<WebAppBuilderInstallDir>\client\stemapp\libs\workflowmanager`
  
* Edit the `<WebAppBuilderInstallDir>\client\stemapp\init.js` file and add `workflowmanager` as a package location in two places
    * Line 99     
      `{
        name: "workflowmanager",
        location: "libs/workflowmanager"
      }`   
    * Line 149    
      `{
        name: "workflowmanager",
        location: window.path + "libs/workflowmanager"
      }`

* Create a Web AppBuilder application and include the WorkflowManager widget into your application.

## Dev setup
This is to setup a continuous integration setup for a development environent.

Prerequisites:
* [npm](https://www.npmjs.com/package/npm) which comes installed with [Node.js](https://nodejs.org/en/download/)
* [Grunt](https://gruntjs.com/) - Install the `grunt` command
  * `npm install -g grunt-cli`
  
Install NPM dependencies for the app
* `cd workflowmanager-createjob-widget`
* `npm install`



