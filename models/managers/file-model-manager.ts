import { CommonModelManager } from "@thxmike/mongoose-common-model-manager";

export class FileModelManager extends CommonModelManager {
  default_filter(data: any) {
    let resp: any = {
      name: data.name
    };
    return resp;
  }

  set_data(ent: any, data: any) {
    super.set_data(ent, data);

    const keys = Object.keys(data);

    for (const key of keys) {
      if (key in ent) {
        ent[key] = data[key];
      }
    }
  }
}
