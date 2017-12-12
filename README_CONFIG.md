# ArcGIS Workflow Manager Create Job Widget

Deployment, configuration and usage steps are provided in this document. Basic knowledge of 
[ArcGIS Enterprise](http://server.arcgis.com), [Portal for ArcGIS](http://server.arcgis.com/en/portal/),
[ArcGIS Workflow Manager Server](https://server.arcgis.com/en/workflow-manager/) and 
Web AppBuilder for ArcGIS is assumed.

## Deployment

The Workflow Manager Create Job widget can be used in the following Web AppBuilder for ArcGIS environments:
* [Web AppBuilder Portal Edition](http://server.arcgis.com/en/portal/latest/use/welcome.htm)
* [Web AppBuilder Developer Edition](https://developers.arcgis.com/web-appbuilder/)

Note: There is currently no support for custom widgets in the [Web AppBuilder Online Edition](http://doc.arcgis.com/en/web-appbuilder/).

### Web AppBuilder Portal Edition
Integrate the Create Job widget with Web AppBuilder Portal Edition.
Beginning with Portal for ArcGIS 10.5.1, you can add custom widgets to your portal.
 
* Refer to the [Web AppBuilder for Portal](http://server.arcgis.com/en/portal/latest/administer/windows/about-web-appbuilder-for-arcgis.htm) documentation.
* Add the Create Job widget as a [custom widget in your portal](http://server.arcgis.com/en/portal/latest/use/add-custom-widgets.htm)
  and share it with groups or your organization. 
* [Create a new Web AppBuilder application](http://server.arcgis.com/en/portal/latest/use/make-first-app.htm) and 
include the Create Job widget into your application.
  * The Create Job widget displays under the `Custom` tab on the `Choose Widget` dialog box in Web AppBuilder. 
* Configure the Create Job widget. Refer to the **Configuration** section below for configuration options.
  * **Note:** When using server authentication in a stand-alone server environment, it may be necessary to add the
  stand-alone server to the list of trusted servers in portal.  
  Refer to [Portal for ArcGIS - Configure security settings](http://server.arcgis.com/en/portal/latest/administer/windows/configure-security.htm).
* Save and publish your application for use.

### Web AppBuilder Developer Edition 
Integrate the Create Job widget with Web AppBuilder Developer Edition.
* Refer to the [Web AppBuilder Developer Edition](https://developers.arcgis.com/web-appbuilder/) documentation.
* Follow [setup instructions for Web AppBuilder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm).
* Clone this Create Job repository to your local drive and copy the `WorkflowManagerCreateJobs` directory to the Web 
AppBuilder's 2D widget directory.
  * e.g. `<WebAppBuilderInstallDir>\client\stemapp\widgets\WorkflowManagerCreateJobs` 
  * Refer to the [Deploy custom widget and theme](https://developers.arcgis.com/web-appbuilder/guide/deploy-custom-widget-and-theme.htm) documentation.
* Run Web AppBuilder Developer Edition and include the Create Job widget into your application.
* Configure the Create Job widget. Refer to the **Configuration** section below for configuration options.
* [Deploy your application](https://developers.arcgis.com/web-appbuilder/guide/xt-deploy-app.htm).
  * **Note:** It may be necessary to use and configure a proxy when using Web AppBuilder Developer Edition. 
    Refer to the link above and/or the **Proxy** section below.

### Proxy
Documentation for usage and configuration:
* [Using the  proxy](https://developers.arcgis.com/javascript/3/jshelp/ags_proxy.html)
* [Setting up a proxy with Web AppBuilder for ArcGIS (Developer Edition)](https://blogs.esri.com/esri/supportcenter/2015/10/28/setting-up-a-proxy-with-web-appbuilder-for-arcgis-developer-edition/)
* Configure the [Web AppBuilder proxy settings](https://developers.arcgis.com/web-appbuilder/guide/use-proxy.htm).

#### Proxy errors
If a `Bad Request` error is returned when accessing your services via the proxy (e.g. `http://host1.domain.com/proxy/proxy.ashx?https://host2.domain.com/arcgis/tokens/&wab_dv=2.6`),
edit the deployed applications's `env.js` file:
* Locate the `appendDeployVersion` function.
* Comment out all the code in the function except for the last line.  The method should look something like the following:
```
  function appendDeployVersion(url){
    // if(/^http(s)?:\/\//.test(url) || /^\/proxy\.js/.test(url) || /^\/\//.test(url)){
    //   return url;
    // }
    // if(url.indexOf('?') > -1){
    //   url = url + '&wab_dv=' + deployVersion;
    // }else{
    //   url = url + '?wab_dv=' + deployVersion;
    // }
    return url;
  }
```

### File types
The Create Job widget makes use of several file type extensions.  Enable these file types in your web server
when deploying the widget:
* woff, woff2, eot

## Configuration

The Create Job widget can be set to open automatically when an application starts. To do so, click the dot on the widget
to turn it dark green.

* To edit the widget settings, hover over the widget and click the small edit icon. The configuration window for this widget opens.

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
  
  **Note:** The selectable map or feature service should be included in the applications web map, otherwise users of the
  application will not have a context of how the job LOI was created. 
    
* **Authentication** - Specify the type of authentication method to use for the widget.
  * `Non-Authenticated`: The Workflow Manager service is not authenticated.  The default user is required in this case since
  user credentials are not available.
  * `Portal Authenticated`: The Workflow Manager service is using ArcGIS Portal authentication in a federated portal environment.
  The user's portal login credentials are used to access the service and the default user is ignored. 
  * `Server Authenticated`: The Workflow Manager service is using ArcGIS Server authentication in a stand-alone server environment.
  The user's server login credentials are used to access the service and the default user is ignored. 
    * **Note:** When using server authentication, additional setup is required.  Refer to the Deployment section of
    this document for more information.

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
* Click on the `Create Job` button to create the job

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
    var stemappDir = '/c/WebAppBuilderForArcGIS/client/stemapp';
    var appDir = '/c/WebAppBuilderForArcGIS/server/apps/20';
    </pre>
    
**Run Grunt**

This will run the watch task which takes care of automatically updating files in WebAppBuilder as you're making updates
to them.
* `grunt`
