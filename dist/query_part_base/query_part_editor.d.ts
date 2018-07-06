/** @ngInject */
export declare function queryPartEditorLabeledDirective($compile: any, templateSrv: any): {
    restrict: string;
    template: string;
    scope: {
        part: string;
        handleEvent: string;
        debounce: string;
    };
    link: ($scope: any, elem: any) => void;
};
