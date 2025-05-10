export class LinkFollower{

    followLink(yamlLink: string) {
        const taskSummaryRegex = this.giveExactSummaryWithSpaces(yamlLink);
        this.findTheTask(taskSummaryRegex);
    }

    findTheTask(taskSummaryRegex: void) {
        throw new Error("Method not implemented.");
    }

    giveExactSummaryWithSpaces(yamlLink: string) {

    }


}