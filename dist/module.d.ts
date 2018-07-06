import { HeroicAnnotationsQueryCtrl } from "./annotation_ctrl";
import HeroicDatasource from "./datasource";
import { HeroicQueryCtrl } from "./query_ctrl";
import { queryPartEditorLabeledDirective } from "./query_part_base/query_part_editor";
declare class HeroicConfigCtrl {
    static templateUrl: string;
}
export { HeroicDatasource as Datasource, HeroicQueryCtrl as QueryCtrl, HeroicConfigCtrl as ConfigCtrl, HeroicAnnotationsQueryCtrl as AnnotationsQueryCtrl, queryPartEditorLabeledDirective as NewDirective };
