package com.example.automaince.controllers;

import com.example.automaince.application.ViewRouter;
import javafx.fxml.FXML;

public class AccessPanelController {
    @FXML private void openGtg() { ViewRouter.show("companies/gtg/GtgLoginView.fxml"); }
    @FXML private void openNotions() { ViewRouter.show("companies/notions/NotionsLoginView.fxml"); }
    @FXML private void openNow() { ViewRouter.show("companies/nowlogistics/NowLoginView.fxml"); }
    @FXML private void openPrintPilot() { ViewRouter.show("companies/printpilot/PrintPilotLoginView.fxml"); }
}
