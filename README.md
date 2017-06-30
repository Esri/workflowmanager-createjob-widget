# workflowmanager-createjob-widget
Sample ArcGIS Workflow Manager Create Job widget for [Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/)

## Setup
* Follow [setup instructions for Web AppBuilder for ArcGIS](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
* Clone this repo to your local drive and copy `WorkflowManagerCreateJobs` to `<WebAppBuilderInstallDir>\client\stemapp\widgets` folder
  * e.g. `<WebAppBuilderInstallDir>\client\stemapp\widgets\WorkflowManagerCreateJobs`
* Copy the following directories from `WorkflowManagerCreateJobs` to `<WebAppBuilderInstallDir>\client\stemapp\libs`
  * `WorkflowManagerCreateJobs\exifjs`
  * `WorkflowManagerCreateJobs\libs\workflowmanager`
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

