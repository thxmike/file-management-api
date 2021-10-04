//Collection -> Survey -> Question
import { MongooseBaseDirector } from '@thxmike/mongoose-base-director';

import { FileModelManager } from './managers/file-model-manager.js';
import { FileSchema } from './schema/file.js';

export class Director extends MongooseBaseDirector {

  private _file_model_manager: any;
   
  get director(): any {
    return {
      "file_model_manager": this._file_model_manager
    };
  }

  setup_schemas() {

    const file_schema = new FileSchema({}, {}, this.mongoose);
    
    return {
      file_schema
    };
  }

  setup_managers(schemas: any) {

    this._file_model_manager = new FileModelManager(
      this.mongoose,
      this.mongoose.model("file", schemas.file_schema)
    );
  }
}