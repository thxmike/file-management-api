export default {
    "site": {
        "port": "3001",
        "whitelist": [
            "https://*.somedomain.com"
        ],
        "allowed_methods": ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
        "allowed_headers": ["Content-Type", "Authorization"],
        "exposed_headers": ["Content-Type", "Content-Length", "count"],
        "certificate_authority": "*",
        "certificate": "*",
        "private_key": "*"
    },
    "identity":{
        "openid_configuration_uri": "https://dev-ro2ag7u3.us.auth0.com/.well-known/openid-configuration",
        "jwks_oauth2_uri": "https://dev-ro2ag7u3.us.auth0.com/.well-known/jwks.json",
        "introspection_uri": "",
        "user_info_endpoint_uri": "https://dev-ro2ag7u3.us.auth0.com/userinfo",
        "auth_uri": "https://dev-ro2ag7u3.us.auth0.com/api/v2/token",
        "iss": "https://dev-ro2ag7u3.us.auth0.com/",
        "client-id": "*",
        "client-secret": "*"
    },
    "mongo": {
        "uri": "mongodb://localhost:27017/file-management",
        "database": "*",
        "username": "",
        "pw": "",
        "debug": true
    },
    "swagger":{
        "file_name": "openapi.json"
    },
    "redis":{
        "host": "localhost",
        "port": 6379,
        "db": 1,
        "debug": true
    },
    "debug": true
}