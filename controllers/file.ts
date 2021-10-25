import { CommonController } from "@thxmike/express-common-controller";
import mongoose from "mongoose";


//TODO: Move Mongoose references and common functionality to common or base controller 
export class FileController extends CommonController {
  //Override
  setup_aggregate_routes() {
    this._router
      .route(this.aggregate_route)
      .get(this.get_aggregate_request.bind(this))
      //Middleware that uploads to the bound to a storage location in the mongo database and allows additional operation
      .post(
        this.data_service.upload.single("file"),
        this.post_aggregate_request.bind(this)
      );
  }

  // @Override
  setup_instance_routes() {
    this._router
      .route(this.instance_route)
      .get(this.get_instance_request.bind(this))
      .post(this.post_instance_request.bind(this))
      .delete(this.delete_instance_request.bind(this));
  }

  post_aggregate_request(req: any, res: any) {
    let filter = this.setup_filter(req.headers, req.query);
    // TODO: Need to figure out a way to make writes to file and
    // user file meta data run at the same time and if either fail,
    // fail the entire transaction
    let payload: any = {
      name: req.file.filename,
      file_id: req.file.id.toString(),
      file_name: req.file.originalname,
      size: req.file.size,
      description: `${req.file.originalname} uploaded on ${req.file.uploadDate} with a size of ${req.file.size}`,
      path: req.query.path || "/",

      //System User
      user_id: "000000000000000000000000",
    };

    if(req.headers.context_id){
      payload.context_id = req.headers.context_id
    }

    this.data_service.file_model_manager
      .post_operation(payload, filter)
      .then((response: any) => {
        res.status(response.status).json(response.message);
      })
      .catch((err: any) => {
        res.status(400).json(err);
      });
  }

  // @Override
  get_aggregate_request(req: any, res: any, next: any) {
    let filter: any = this._check_filter(req);

    let path = "/";

    if (filter.path) {
      path = filter.path;
      delete filter.path;
    }

    if (this.has_parent) {
      let parts = req.baseUrl.split("/");
      let parent_id = `${this._parent.alternate_name}_id`;
      let objectid: any = `${parts[parts.length - 1]}`;
      let item = { [parent_id]: objectid };

      if (mongoose.isValidObjectId(objectid)) {
        objectid = mongoose.Types.ObjectId(objectid);
        item = { [parent_id]: objectid };
      }

      filter = {
        ...filter,
        ...item,
      };
    }
    let count = 0;

    req.query.filter = filter;

    let args = CommonController.parse_query_string_to_args(req);

    return (
      this.data_service.file_model_manager
        .get_count(args[2])
        .then((cnt: number) => {
          count = cnt;
          if ((args[0] - 1) * args[1] > count && args[0] !== 1) {
            return Promise.reject({ code: 404, error: "page not found" });
          }
          return this.data_service.file_model_manager.get_aggregate_operation(
            ...args
          );
        })
        //Filter and seperate Folders and Files
        .then((response: any) => {
          res.header("count", count);
          this._setup_header(args, res, response);
          res.status(response.status).json(response.message);
          return Promise.resolve();
        })
        .catch((err: any) => {
          return this._send_error(
            res,
            req,
            err,
            this.constructor.name,
            "get_aggregate_request"
          );
        })
    );
  }

  // @Override
  get_instance_request(req: any, res: any) {
    let id = req.params[`${this.alternate_name}_id`];

    this.data_service.file_model_manager
      .get_instance_operation_by_id(id)
      .then((response: any) => {
        res.status(response.status).json(response.message);
      })
      .catch((err: any) => {
        return this._send_error(
          res,
          req,
          err,
          this.constructor.name,
          "get_instance_request"
        );
      });
  }


  //@Override
  delete_instance_request(req: any, res: any) {
    let id = req.params[`${this.alternate_name}_id`];

    let filter: any = this._check_filter(req);

    if (this.has_parent) {
      let parts = req.baseUrl.split("/");
      let parent_id = `${this._parent.alternate_name}_id`;
      let objectid: any = `${parts[parts.length - 1]}`;
      let item = { [parent_id]: objectid };

      if (mongoose.isValidObjectId(objectid)) {
        objectid = this.data_service.mongoose.Types.ObjectId(objectid);
        item = { [parent_id]: objectid };
      }

      filter = {
        ...filter,
        ...item,
      };
    }
    req.query.filter = filter;

    let args = CommonController.parse_query_string_to_args(req);

    if (id !== "0") {
      this.delete_item(id, req, res);
    } else {
      return this.data_service.file_model_manager
        .get_aggregate_operation(...args)
        .then((response: any) => {
          response.message.forEach((record: any) => {
            this.delete_item(record.original_file_id, req, res);
          });
        })
        .then(() => {
          res.status(200).json("completed");
        })
        .catch(() => {
          res.status(400).send("deletion did not succeed");
        });
    }
  }

  delete_item(id: any,  req: any, res: any) {

    this.data_service.file_model_manager.get_instance_operation_by_id(id)
      .then((response: any) => {
        return this.data_service.gfs.delete(
          response.message.original_file_id.toString(),
          (err: any) => {
            if (err) {
              res.status(400).json({ err: err.message });
              return
              //continue to delete the db
            }
            return this.data_service.file_model_manager
              .delete_operation(
                id,
                req.body,
                false
              )
              .then((response: any) => {
                res.status(200).send(response);
              })
              .catch((err: any) => {
                return this._send_error(
                  res,
                  req,
                  err,
                  this.constructor.name,
                  "delete_instance_request"
                );
              });
          });
      });
  }

  post_instance_request(req: any, res: any) {
    this.data_service.file_model_manager.get_instance_operation_by_id(req.params.file_id)
      .then((response: any) => {
        return this.data_service.gfs
        .find({ filename: response.message.name })
        .toArray((err: any, files: any) => {
          if (!files || files.length === 0) {
            return res.status(404).json({
              err: "no files exist",
            });
          }
          this.data_service.gfs
            .openDownloadStreamByName(response.message.name)
            .pipe(res);
        });
      })
      .catch((err: any) => {
        res.status(404).send(err);
      })

  }

  _check_filter(req: any) {
    let filter = {};

    if (req.query.filter) {
      filter = req.query.filter;
    }

    if (typeof filter === "string") {
      filter = JSON.parse(filter);
    }
    return filter;
  }

}
