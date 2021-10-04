import { CommonController } from "@thxmike/express-common-controller";
import * as mongoose from "mongoose";

class FileController extends CommonController {
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

  post_aggregate_request(req: any, res: any) {
    //TODO: Need to figure out a way to make writes to file and
    // user file meta data run at the same time and if either fail,
    // fail the entire transaction
    let payload = {
      name: req.file.filename,
      original_file_id: req.file.id,
      original_file_name: req.file.originalname,
      description: `${req.file.originalname} uploaded on ${req.file.uploadDate} with a size of ${req.file.size}`,
      path: req.query.path || "/",

      //System User
      user_id: "000000000000000000000000",
    };

    //Attach a User to the file.
    if (this.has_parent) {
      let parts = req.baseUrl.split("/");
      payload.user_id = parts[parts.length - 1];
    }

    this.data_service.file_model_manager
      .post_operation(payload)
      .then((response: any) => {
        res.status(response.status).json(response.message);
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
          let updated_messages: any[] = [];
          if (path) {
            const files = response.message.filter((file: any) =>
              file.path.startsWith(path)
            );
            files.forEach((fileorfold: any) => {
              //fileorfold.toJSON
              let type: any = null;
              if (fileorfold.path === path) {
                type = "file";
              } else {
                type = "folder";

                delete fileorfold.name;
                delete fileorfold.original_file_name;
                delete fileorfold.description;
              }

              if (
                updated_messages.find(
                  (item) =>
                    item.type === "folder" &&
                    type === "folder" &&
                    item.path === fileorfold.path
                )
              ) {
                //skip: I already have this folder in the collection
              } else {
                let merged_data = { ...fileorfold, ...{ type: type } };
                updated_messages.push(merged_data);
              }
            });
            response.message = updated_messages;
          }
          return response;
        })
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

  // @Override
  patch_instance_request(req: any, res: any) {
    let id = req.params[`${this.alternate_name}_id`];

    this.data_service.file_model_manager
      .patch_operation(id, req.body)
      .then((response: any) => {
        res.status(response.status).json(response.message);
      })
      .catch((err: any) => {
        return this._send_error(
          res,
          req,
          err,
          this.constructor.name,
          "patch_instance_request"
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
        objectid = mongoose.Types.ObjectId(objectid);
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
      this.delete_item(id, filter.file_id, req, res);
    } else {
      return this.data_service.file_model_manager
        .get_aggregate_operation(...args)
        .then((response: any) => {
          response.message.forEach((record: any) => {
            this.delete_item(record.original_file_id, record._id, req, res);
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

  delete_item(original_file_id: any, file_id: any, req: any, res: any) {
    this.data_service.gfs.delete(
      new mongoose.Types.ObjectId(original_file_id),
      (err: any) => {
        if (err) {
          //return res.status(404).json({ err: err });
          //continue to delete the db
        }
        return this.data_service.file_model_manager
          .delete_operation(
            new mongoose.Types.ObjectId(file_id),
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
      }
    );
  }

  post_instance_request(req: any, res: any) {
    this.data_service.gfs
      .find({ filename: req.params.file_id })
      .toArray((err: any, files: any) => {
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: "no files exist",
          });
        }
        this.data_service.gfs
          .openDownloadStreamByName(req.params.file_id)
          .pipe(res);
      });
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

  //Get and Update a User
  // @Override
  setup_instance_routes() {
    this._router
      .route(this.instance_route)
      .get(this.get_instance_request.bind(this))
      .patch(this.patch_instance_request.bind(this))
      .post(this.post_instance_request.bind(this))
      .delete(this.delete_instance_request.bind(this));
  }
}
module.exports = FileController;
