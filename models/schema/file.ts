import { MongooseBaseSchema } from '@thxmike/mongoose-base-schema';

export class FileSchema extends MongooseBaseSchema {
    constructor(obj: any, options: any, my_mongoose: any) {

        super(obj, options, my_mongoose);
    
        let additional_schema = {
          "path": {
            "type": String,
            "required": true
          },
          "issue_id": {
            "type":  my_mongoose.Schema.Types.ObjectId,
            "required": true
          },
          "original_file_name": {
            "type": String,
            "required": true
          },
          "original_file_id":{
            "type": my_mongoose.Schema.Types.ObjectId,
          },
        };
        
        // Not required at this level
        delete this.paths.code;

        this.add( 
          additional_schema
        )
      }
}
