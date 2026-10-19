package com.example.automaince.companies.nowlogistics;
import com.example.automaince.controllers.CompanyLoginController;
import javafx.fxml.FXML;
public class NowLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("NOW Logistics"); } @FXML private void back() { backToCompanies(); } }


