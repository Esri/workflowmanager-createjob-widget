# Workflow Manager Create Job Widget

Sample [ArcGIS Workflow Manager](https://server.arcgis.com/en/workflow-manager/) Create Job widget for [Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/)

## Portal Deployment
Information about Web AppBuilder for Portal: http://server.arcgis.com/en/portal/latest/administer/windows/about-web-appbuilder-for-arcgis.htm

* Run Web AppBuilder from your Portal installation
  * e.g. http://hostname.domain.com/portal/apps/webappbuilder
* Register the Workflow Manager Create Job widget as a custom widget.
  * http://server.arcgis.com/en/portal/latest/use/add-custom-widgets.htm
* Create a new application using the custom widget

## Limitations
* 
  

## Developer Setup
* Follow [setup instructions for Web AppBuilder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
* Clone this repo to your local drive and copy `WorkflowManagerCreateJobs` to `<WebAppBuilderInstallDir>\client\stemapp\widgets` folder
  * e.g. `<WebAppBuilderInstallDir>\client\stemapp\widgets\WorkflowManagerCreateJobs` 
* Run Web AppBuilder Developer Edition and include the Workflow Manager Create Job widget into your application.
  * For widget development, run Web AppBuilder by appending `?id=stemapp`
  * Example: http://hostname:3344/webappbuilder/?id=stemapp

* Deploy your application
  * https://developers.arcgis.com/web-appbuilder/guide/xt-deploy-app.htm
* Deploy the custom widget
  * https://developers.arcgis.com/web-appbuilder/guide/deploy-custom-widget-and-theme.htm

### Continuous Integration
This is to setup a continuous integration setup using Grunt for a development environment.
From the local drive where you cloned this repository, you can run a watch task which will take care of 
automatically updating files in Web AppBuilder as you're making updates to the files in this local
directory.

**Prerequisites**
* [npm](https://www.npmjs.com/package/npm) which comes installed with [Node.js](https://nodejs.org/en/download/)
* [Grunt](https://gruntjs.com/) - Install the `grunt` command globally
  * `npm install -g grunt-cli`
  
**Install NPM dependencies for the app**

Run `npm install` from the local drive where this repo was cloned to.
* `cd workflowmanager-createjob-widget` - 
* `npm install`

**Update the Grunt configuration**
* Edit the `gruntfile.js` file in the project
* Update the following paths to point to your Web App Builder installation
  * stemappDir - location of WebAppBuilder stemapp directory
  * appDir - location of WebAppBuilder application directory
    <pre>
    var stemappDir = '/Users/cody7018/Projects/WebAppBuilderForArcGIS/client/stemapp';
    var appDir = '/Users/cody7018/Projects/WebAppBuilderForArcGIS/server/apps/4';
    </pre>
    
**Run Grunt**

This will run the watch task which takes care of automatically updating files in WebAppBuilder as you're making updates
to them.
* `grunt`




