# Workflow Manager Create Job Widget
## Overview

The [ArcGIS Workflow Manager](https://server.arcgis.com/en/workflow-manager/) Create Job Custom Widget enables users to 
integrate ArcGIS Workflow Manager functions with their own applications created in 
[Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/). It is designed so users can configure 
and deploy the widget and create jobs in ArcGIS Workflow Manager easily and quickly. Source code is also provided for 
developers who would like to customize the widget. 
 
Deployment, configuration and usage steps are provided in this document. Basic knowledge of ArcGIS Portal, ArcGIS Server, 
ArcGIS Workflow Manager Server and ArcGIS Web AppBuilder is assumed.

## Deployment

The ArcGIS Workflow Manager Create Job Custom Widget can be used in 
the following [Web AppBuilder for ArcGIS](http://doc.arcgis.com/en/web-appbuilder/) environments:
* [Web AppBuilder Portal Edition](http://server.arcgis.com/en/portal/latest/use/welcome.htm)
* [Web AppBuilder Developer Edition](https://developers.arcgis.com/web-appbuilder/)

Note: There is currently no support for custom widgets in the [Web AppBuilder Online Edition](http://doc.arcgis.com/en/web-appbuilder/).


### Web AppBuilder Portal Edition
Instructions for using the Create Job widget with Web AppBuilder Portal Edition 

Information about Web AppBuilder for Portal: http://server.arcgis.com/en/portal/latest/administer/windows/about-web-appbuilder-for-arcgis.htm

* Run Web AppBuilder from your Portal installation
  * e.g. http://hostname.domain.com/portal/apps/webappbuilder
* Register the Create Job widget as a custom widget.
  * http://server.arcgis.com/en/portal/latest/use/add-custom-widgets.htm
* Create a new application and include the Create Job widget into your application.
* Configure the Create Job widget
* Save and publish your application for use

### Web AppBuilder Developer Edition 
Instructions for using the Create Job widget with Web AppBuilder Developer Edition
* Follow [setup instructions for Web AppBuilder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
* Clone this Create Job repository to your local drive and copy the `WorkflowManagerCreateJobs` directory to the Web 
AppBuilder's 2D widget directory
  * e.g. `<WebAppBuilderInstallDir>\client\stemapp\widgets\WorkflowManagerCreateJobs` 
  * Refer to the [Deploy custom widget and theme](https://developers.arcgis.com/web-appbuilder/guide/deploy-custom-widget-and-theme.htm) documentation
* Run Web AppBuilder Developer Edition and include the Create Job widget into your application.
* Configure the Create Job widget
* Deploy your application
  * https://developers.arcgis.com/web-appbuilder/guide/xt-deploy-app.htm

Note: For widget development, run Web AppBuilder by appending `?id=stemapp` to the Web AppBuilder URL
  * Example: `http://hostname:3344/webappbuilder/?id=stemapp`

## Configuration

The Create Job widget can be set to open automatically when an application starts. To do so, click the dot on the widget
to turn it dark green.

To edit the widget settings, hover over the widget and click the small edit icon. The configuration window for this widget opens.

* **Widget icon** - optionally, click the `change widget icon` button and replace it with your own image.
  A file explorer window opens, allowing you to select a local image file to use as the widget icon. 

* **Workflow Manager Server URL** - Provide the Workflow Manager for Server URL. By default, the widget uses the 
Workflow Manager sample service URL.

* **Selectable map or feature service** - Optionally provide a selectable map or feature service for defining a 
job's location of interest (LOI).
  Rather than sketching a job LOI on the map, users can select a job's LOI from this selectable map or feature service.
  When selecting features from the service, the widget uses `intersect` to determine the features that intersect
  the drawn feature.
  * e.g. https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/3
  
  Note: The selectable map or feature service should be included in the applications web map, otherwise users of the
  application will not have a context of how the job LOI was created. 
    
* **Authentication** - Specify the type of authentication method to use for the widget.
  * Non-Authenticated: The Workflow Manager service is not authenticated.  The default user is required in this case since
  user credentials are not available.
  * Portal Authenticated: The Workflow Manager service is using ArcGIS Portal authentication in a federated portal environment.
  The user's portal login credentials are used to access the service and the default user is ignored. 
  * Server Authenticated: The Workflow Manager service is using ArcGIS Server authentication in a stand-alone server environment.
  The user's server login credentials are used to access the service and the default user is ignored. 

* **Configurable Labels** - Optionally you can update the following labels:
  * Define Location Label
  * Extended Properties Label

* **Attachments** - Allow or disallow attachments for jobs
  * Click on the `Allow Attachments` checkbox to allow users to add attachments to jobs
  * Optionally update the Attachments Label
  * Provide a maximum attachment filesize.  The configured maximum attachment size cannot be more than the allowed attachment
size for your database.

* **Workflow Manager Map Service URL** - Configuration of this section is only required when the Workflow Manager system 
settings are configured to disallow overlapping job location of interests (LOIs).
  * Click on the `Configure Workflow Manager Map Service` checkbox if job LOI overlap is not allowed in your Workflow Manager
  configuration.
  * Provide the Workflow Manager Map Service URL to be used to check job LOI overlap. By default, the widget uses the 
  Workflow Manager sample service URL.
  * Provide the point of interest (POI) layer Id (if applicable)
  * Provide the area of interest (AOI) layer Id (if applicable)

* **Click the `Set` button** to update the widget's configuration and load the job types and extended properties for the 
specified Workflow Manager Server URL. The job type section 

* **Configure Job Types and Extended Properties** - Add one or more job types to the widget and configure extended 
properties for each job type:
  * Click on the `+ Job Type` button to add job type entry.
  * Click on `Select a job type` drop down to select a job type to configure.
  * Optionally select an icon for the job type.
  * Select which extended properties for the job type will be visible in the widget.
  * Repeat the previous steps for configuring multiple job types.

* **Click OK** to save and close the Create Job widget configuration window.

## Usage

* The widget opens with a list of jobs types that jobs can be created from, and a search bar for filtering
  job types.
  * Only users with visible job types and the `CreateJob` privilege can use the widget.
* Select a job type to create a job from.  This brings up the create job view.
* Optionally define a job's location of interest (LOI)
* Optionally populate the job's extended properties
* Optionally add a job attachment
* Optionally add a note to the job
* Click on the `Create Job` to create the job


## Additional Resources

#### Continuous Integration for Widget Development
This is to setup a continuous integration setup using [Grunt](https://gruntjs.com/) for making modifications to the 
Workflow Manager Create Job widget in a development environment.
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




