package com.example.automaince.controllers;
import javafx.fxml.FXML;
public class NowLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("NOW Logistics"); } @FXML private void back() { backToCompanies(); } }
