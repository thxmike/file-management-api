
import { ConfigurationService } from '@thxmike/configuration';
import { ConsoleService } from '@thxmike/console-debug';
import { AppControllerService } from '@thxmike/express-app-controller';
import { ExpressIdentityJWTTokenLoginService } from '@thxmike/express-identity-jwt-token-login';
import { RootController } from '@thxmike/express-root-controller';
import { ExpressRouteLogger } from '@thxmike/express-route-logger';
import { FileSystemService } from '@thxmike/file-system';
import { HttpServerService } from '@thxmike/http-server';
import { JsonMessageService } from '@thxmike/json-message';
import { MongooseSetupService } from '@thxmike/mongoose-setup';
import express from 'express';
import util from 'util';

import configuration_object from './configuration.js';
import { TenantController } from './controllers/tenant.js';
import { Director } from './models/index.js';

let app_directory = './';

/*
 *This serves as the systems orchestration.
 *It instantiates objects, apply overrides, sets up server and dependencies, wire up configuration, and starts the server
 *Sets up Configuration
 */
console.log(`NodeJS Version: ${process.version}`);

const file_system_service = new FileSystemService();

const environment_variables = process.env;

if (environment_variables.PORT) {
  configuration_object.site.port = environment_variables.PORT;
}
const configuration_service = new ConfigurationService(configuration_object);

const app = express();

//console.log("Overriding configuration with environment variables");
//configuration_service.apply_environment_variable_overrides();
//syswidecas.addCAs(configuration_service.configuration.ca_folder);

let _ = new ConsoleService(configuration_service.configuration.debug, console);

let setup_root_controller = () => {
  let root_controller = {};

  if (
    configuration_service.configuration.swagger &&
    configuration_service.configuration.swagger.file_name
  ) {
    let file_path = `${app_directory}${configuration_service.configuration.swagger.file_name}`;

    file_system_service.is_exists(file_path).then((response) => {
      if (response) {
        file_system_service.read_file(file_path).then((content) => {
          if (content) {
            root_controller = new RootController(
              app,
              JSON.parse(content.toString())
            );
            console.debug(root_controller.constructor.name);
          } else {
            root_controller = new RootController(app);
            console.debug(root_controller.constructor.name);
          }
        });
      } else {
        root_controller = new RootController(app);
        console.debug(root_controller.constructor.name);
      }
    });
  } else {
    root_controller = new RootController(app);
    console.debug(root_controller.constructor.name);
  }
};


let start = () => {
  console.debug("Setting up Express Web Server");
  console.debug(
    `Port: ${
      environment_variables.PORT ||
      configuration_service.configuration.site.port
    }`
  );

  
  console.debug(
    `Using the following Identity Server: ${configuration_service.configuration.identity.iss}`
  );

  const message_service = new JsonMessageService();
  
  // Using example identity provider
  const express_identity_token_login_service = new ExpressIdentityJWTTokenLoginService(
    configuration_service.configuration.identity.openid_configuration_uri,
    configuration_service.configuration.identity.jwks_oauth2_uri,
    configuration_service.configuration.identity.introspection_uri,
    configuration_service.configuration.identity.user_info_endpoint_uri,
    configuration_service.configuration.identity['client-id'],
    configuration_service.configuration.identity['client-secret']
  );

  const application_root = "/api/";
  const version = "v1";

  const app_controller = new AppControllerService(
    app,
    configuration_service.configuration.site.whitelist,
    configuration_service.configuration.site.allowed_methods,
    configuration_service.configuration.site.allowed_headers,
    configuration_service.configuration.site.exposed_headers,
    ExpressRouteLogger.log
  );

  console.debug(app_controller.constructor.name);

  let { port } = configuration_service.configuration.site;

  const http_server_service = new HttpServerService(
    app,
    configuration_service.configuration.site.port,
    port === 80 ? null : configuration_service.configuration.certificate_file,
    port === 80 ? null : configuration_service.configuration.private_key_file
  );

  console.debug("Setting up connection to database");
  const mongo_setup_service = new MongooseSetupService(
    Director,
    configuration_service.configuration.mongo.uri,
    configuration_service.configuration.mongo.debug,
    configuration_service.configuration.mongo.username,
    configuration_service.configuration.mongo.password
  );
  
  console.debug(`Connecting To Mongo Database Server: ${configuration_service.configuration.mongo.uri}`);
  
    return http_server_service.start().then(() => {
      console.debug("Setting up Route Controllers");

      setup_root_controller();

      //Setup Routes on Application
      const tenant_controller = new TenantController(
        "tenant",
        app,
        express.Router(),
        application_root,
        version,
        mongo_setup_service.director.tenant_model_manager,
        message_service,
        [express_identity_token_login_service.authenticate.bind(express_identity_token_login_service),
         ]
      );
      
      console.debug(`Setting Up ${tenant_controller.constructor.name}`);

    });
  
};

/* TODO: Connect to Vault and apply overrides on application startup
console.log(`Connecting to Vault and overriding configuration: 
  ${environment_variables.AZURE_KEY_STORE_URI}`);
console.log(
  `AZURE_KEY_STORE_URI: ${environment_variables.AZURE_KEY_STORE_URI}`
);
*/

configuration_service
  .apply_azure_vault_overrides()
  .then(() => {
    return start();
  })
  .catch((err: any) => {
    console.debug(util.inspect(err, { showHidden: false, depth: null }));
  });
