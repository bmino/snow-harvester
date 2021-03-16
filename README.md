# Snow Harvester

This app monitors strategies for the snowball yield farming ecosystem and appropriately harvests gains.

## Getting Started
These instructions will get a copy of the project up and running on your local machine for development and testing purposes.


### Install Prerequisites
The following dependencies are recommended to run an instance:

1. **NodeJS** - 14.15.4
2. **Npm** - 6.14.10


### Obtain the Codebase
* Clone from github
    ```
    git clone https://github.com/bmino/snow-harvester.git
    ```


### Configuration
All configuration is managed inside the `/config` directory.
To setup your configuration for the first time, duplicate the `ConfigExample.js` file and remove the "Example" so the file becomes `Config.js`.
This process must be done before deploying the app for the first time and redone after each major version update where the configuration has changed.


### Assumptions
1. AVAX and WAVAX values are essentially equivalent


### Deployment
1. Install project dependencies
    ```
    cd snow-harvester
    npm install
    ```

2. Start the application
    ```
    npm start
    ```


## Logging
All logs are sent to stdout and stderr


## Authors
* **[bmino](https://github.com/bmino)** - *Project Dev*

See also the list of [contributors](https://github.com/bmino/snow-harvester/contributors) who participated in this project.


## Donations
The developers listed above created and update this project.
I don't expect any compensation, but if you appreciate my work feel free to donate to the following addresses:

* Avalanche: 0xFd7b8597cF8eE5317439B0B5C55a111F6Eec449D

## License
This project is licensed under mit
