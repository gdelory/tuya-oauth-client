## Intro

This is a really basic command line tools to control Gosund switched which are 
registered on the Smart Life application.

This is done through a Tuya cloud application. To use this you need to register on
[iot.tuya.com](https://iot.tuya.com/). Make sure you choose US, this will skips some validation step.

Then create a new Cloud development app choosing `Smart Home` in both Industry and development method. This will give you your
Oauth client ID and secret. Then you need to subscribe to the IoT core service API and register your devices.

Easier for me is to use the `Link Tuya App Account` tab and scan the QR code with your SMart Life mobile app (Me > top right corner icon), this
should register all the devices you already registered in the app.

## Usage

Make sure you export those 3 environment variables:

 * `TUYA_HOST` the tuya host, for instance https://openapi.tuyaeu.com or https://openapi.tuyacn.com
 * `TUYA_CLIENT_ID` your Oauth client ID obtained on the Cloud > Development > <project_name>
 * `TUYA_CLIENT_SECRET` your Oauth client Secret obtained on the Cloud > Development > <project_name>

Run:

`bin/tuya deviceId command`

Commands are:
 * `info`: dump the whole json info
 * `status`: display true/false if the switch is on/off
 * `switch_on`: switch on the plug
 * `switch_off`: switch off the plug

You will find the deviceId is the page Cloud > Development > <project_name> > Devices tab
