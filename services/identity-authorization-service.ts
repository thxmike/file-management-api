import jwt from 'jsonwebtoken';

interface IAuthorizations { [context_id: string]: [{ key: string, value: boolean }]}


//Express Middleware to support a simple authorization system.
export class ExpressIdentityJWTTokenAuthorizationService {

  private _current_authorizations: Map<string, [{ key: string, value: boolean }]>;

  constructor(
    current_authorization_configuration: IAuthorizations
  ) {
    this._current_authorizations = new Map();
    for(let context_id in current_authorization_configuration){
      this._current_authorizations.set(context_id, current_authorization_configuration[context_id]);
    };
  }
  
  public is_authorized(req: any, res: any, next: any) {
    let is_auth = false;
    let parsed_token = this.parse_credentials_token(req.headers.authorization);
    let decoded_token: any = this.decoded_token(parsed_token);
    let application_id = decoded_token.payload.appid.toLowerCase();
    let account_id = decoded_token.payload.oid.toLowerCase();
    let application_authorizations = this._current_authorizations.get(application_id);
    if (application_authorizations) {
        is_auth = application_authorizations.find(x => x.key === account_id) ? true: false;
        req.headers.context_id = application_id
        next();
    } else {
      res.status(401).send("Unauthorized");
    }
  }

  //TODO: moved to shared code
  private decoded_token(token: string) {
    return jwt.decode(token, { complete: true });
  }

  //TODO: Moved to shared code
  private parse_credentials_token(header: any) {
    let access_token = header.replace(/^Bearer/, "").trim();

    if (!access_token) {
      throw new Error("Invalid Token");
    }
    return access_token;
  }
}
