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

Just clone and run `npm install` in the tool's folder.

`git clone git@github.com:gdelory/tuya-oauth-client.git && cd tuya-oauth-client && npm install`

All commands require three things to be defined either via command line options, or environment variables:

 * `API Base URL`: for instance https://openapi.tuyaeu.com or https://openapi.tuyacn.com, can be either defined using the `TUYA_HOST` environment variable, or the command line option `--baseUrl`
 * `your project OAuth client ID`:  your Oauth client ID obtained on the Cloud > Development > <project_name>,  can be either defined using the `TUYA_CLIENT_ID` environment variable, or the command line option `--clientId`
 * `your project OAuth client secret`:  your Oauth client secret obtained on the Cloud > Development > <project_name>,  can be either defined using the `TUYA_CLIENT_SECRET` environment variable, or the command line option `--clientSecret`

Run:

`bin/tuya --help` to get the list of commands available. At this day we support:

 * `info`: dump the whole json info from the device (`/v1.0/devices/${deviceId}` endpoint)
 * `specs`: dump the whole json info from the [/specification endpoint](https://developer.tuya.com/en/docs/cloud/68c2e82f73?id=Kag2ybtxwlb9w)
 * `switch`: All commands for switched
 * `curtain`: All commands for curtains

Use `bin/tuya <command> --help` to get more information about a specific command.

All commands require the requied option `-d | --deviceId`, a call shoud look like:

`bin/tuya -d <deviceId> <command> [options]` or `bin/tuya --deviceId=<deviceId> <command> [options]`

You will find the deviceId is the page Cloud > Development > <project_name> > Devices tab

You can also use the run-sample.sh script to set the environment variable once for all and call it:

```
cp run-sample.sh run.sh
chmod u+x run.sh
# Edit run.sh to add your OAuth client ID and secret
./run.sh -d <deviceId> <command> [options]
```

For debugging purpose you can also use the verbose (`-v|--verbose`) mode which show the parameters passed:

`bin/tuya -v -d <deviceId> <command> [options]`

## Switch command

Usage: `bin/tuya -d <deviceId> switch <command> [-i <index>]`

You can use index from 1 to X if your switch expose multiple switches. Index starts at 1, not 0.

Commands available: 

 * `on`: switch on the switch. Example: `bin/tuya -d <deviceId> switch on`
 * `off`: switch on the switch. Example: `bin/tuya -d <deviceId> switch off`
 * `power`: display a json object of power consumption statistic, if your device supports it. Example of output: `{ current: 1733, power: 4014, voltage: 2313 }`

 Help dump:

 ```
tuya switch <command>

All switches commands

Positionals:
  command  command to execute on the switch
                                      [required] [choices: "on", "off", "power"]

Options:
  -d, --deviceId      The device ID to control                        [required]
      --clientId      The OAuth client ID of your Tuya cloud project. This can
                      also be provided by the TUYA_CLIENT_ID environment
                      variable
      --clientSecret  The OAuth client Secret of your Tuya cloud project. This
                      can also be provided by the TUYA_CLIENT_SECRET environment
                      variable
      --baseUrl       The base URL. This can also be provided by the TUYA_HOST
                      environment variable
  -i, --index         In case this is a multiple switch device, specifies the
                      index of the switch to control. Index starts at 1, not 0
 ```


 
## Curtain command

Usage: `bin/tuya -d <deviceId> curtain <command> [--upTime=XX] [--downTime=XX] [--progress=]`

 * `open`: Open the curtain. Example: `bin/tuya -d <deviceId> curtain open`
 * `close`: Close the curtain. Example: `bin/tuya -d <deviceId> curtain close`
 * `stop`: Stop the movement of the curtain if it's currently opening/closing. Example: `bin/tuya -d <deviceId> curtain stop`

You can control how much percent to open (from the current position, not as absolute position) using the `--percent=XX` option. However for this to work, you need to provide the total time it takes your curtain to go up or down either using command line option of environment variables.

 * `up`: `CURTAIN_UP_TIME` environment variable or --upTime` option. Value is in seconds
 * `down`: `CURTAIN_DOWN_TIME` environment variable or --downTime` option. Value is in seconds

 For instance to open only at 50% your curtain, use:

 `bin/tuya -d <deviceId> curtain open --upTime=22 --progress=50`

 Assuming this curtain takes 22 seconds to fully open.

 Help dump:

 ```
tuya curtain <command>

All curtains commands

Positionals:
  command  command to execute on the curtain
                                   [required] [choices: "open", "close", "stop"]

Options:
  -d, --deviceId      The device ID to control                        [required]
      --clientId      The OAuth client ID of your Tuya cloud project. This can
                      also be provided by the TUYA_CLIENT_ID environment
                      variable
      --clientSecret  The OAuth client Secret of your Tuya cloud project. This
                      can also be provided by the TUYA_CLIENT_SECRET environment
                      variable
      --baseUrl       The base URL. This can also be provided by the TUYA_HOST
                      environment variable
      --percent       Percentage to open
      --upTime        The time it takes for your curtain to fully open, in
                      seconds. This can also be set using the CURTAIN_UP_TIME
                      environment variable.
      --downTime      The time it takes for your curtain to fully close, in
                      seconds. This can also be set using the CURTAIN_DOWN_TIME
                      environment variable.
 ```