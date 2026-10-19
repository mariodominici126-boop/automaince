package com.example.automaince.companies.gtg;
import com.example.automaince.controllers.CompanyLoginController;
import javafx.fxml.FXML;
public class GtgLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("Global Technology Group"); } @FXML private void back() { backToCompanies(); } }


