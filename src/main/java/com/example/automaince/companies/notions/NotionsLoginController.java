package com.example.automaince.controllers;
import javafx.fxml.FXML;
public class NotionsLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("Notions Group"); } @FXML private void back() { backToCompanies(); } }
