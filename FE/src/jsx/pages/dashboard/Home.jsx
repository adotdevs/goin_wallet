import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Col, Row } from 'react-bootstrap';

//Import 
import { SVGICON } from '../../constant/theme';
import MainSlider from '../../elements/dashboard/MainSlider';
import StatisticsBlog from '../../elements/dashboard/StatisticsBlog';
import MarketOverViewBlog from '../../elements/dashboard/MarketOverViewBlog';
import RecentTransaction from '../../elements/dashboard/RecentTransaction';
import DashboardAssetsWallets from './DashboardAssetsWallets';
import { ThemeContext } from '../../../context/ThemeContext';
import { useAuthUser, useSignOut } from 'react-auth-kit';
import { toast } from 'react-toastify';
import { getCoinsUserApi, getHtmlDataApi, getsignUserApi, patchCoinsApi, getLinksApi } from '../../../Api/Service';
import { getTransactionsForCoin } from '../report/assets/coinConfig';
import { sumCoinPendingIncoming } from '../../../utils/euroCoinUtils';
import axios from 'axios';
import { ShieldCheck, Clock, AlertTriangle, Sparkles, FileSignature, ArrowRight } from 'lucide-react';

const compare = ['/dashboard', '/index-2'];

export function MainComponent() {
	const [modal, setModal] = useState(false);
	const [isLoading, setisLoading] = useState(true);
	const [UserData, setUserData] = useState(true);
	const [totalBalance, settotalBalance] = useState(null);
	const [totalBalancePending, settotalBalancePending] = useState(null);
	const [fractionBalance, setfractionBalance] = useState(null);
	const [fractionBalancePending, setfractionBalancePending] = useState(null);
	const [Description, setDescription] = useState(null);
	const [Description2, setDescription2] = useState(null);
	const [showReferralAd, setShowReferralAd] = useState(false);
	const [referralLinkEnabled, setReferralLinkEnabled] = useState(false);

	const [singleTransaction, setsingleTransaction] = useState();
	const [UserTransactions, setUserTransactions] = useState([]);
	const [btcBalance, setbtcBalance] = useState(0);

	const [ethBalance, setethBalance] = useState(0);
	const [usdtBalance, setusdtBalance] = useState(0);
	const [Active, setActive] = useState(false);

	const [liveBtc, setliveBtc] = useState(null);
	let AuthUse = useAuthUser();
	let signOut = useSignOut();
	const [isUser, setIsUser] = useState({});
	let Navigate = useNavigate();
	let toggleDrop = () => {
		drop ? setdrop(false) : setdrop(true);
	};
	const [drop, setdrop] = useState(false);
	const patchCoins = async () => {
		try {
			const userCoins = await patchCoinsApi(authUser().user._id);

			if (userCoins.success) {

			} else {
				toast.dismiss();
				toast.error(userCoins.msg);
			}
		} catch (error) {
			toast.dismiss();
			toast.error(error);
		} finally {
		}
	};
	const getsignUser = async () => {
		try {
			const formData = new FormData();
			formData.append("id", AuthUse().user._id);
			const userCoins = await getsignUserApi(formData);

			if (userCoins.success) {
				setIsUser(userCoins.signleUser);

				return;
			} else {
				toast.dismiss();
				toast.error(userCoins.msg);
			}
		} catch (error) {
			toast.dismiss();
			toast.error(error);
		} finally {
		}
	};
	let authUser = useAuthUser();
	const [Admin, setAdmin] = useState("");
	const getCoins = async (data) => {
		let id = data._id;
		try {
			const userCoins = await getCoinsUserApi(id);
			// const response = await axios.get(
			// 	"https://api.coindesk.com/v1/bpi/currentprice.json"
			// );

			if (userCoins.success) {
				setUserData(userCoins.getCoin);
				// setUserTransactions;

				setUserTransactions(
					userCoins.getCoin.transactions.reverse().slice(0, 5)
				);
				setisLoading(false);
				const txs = userCoins.getCoin.transactions || [];
				const btcValueAdded = getTransactionsForCoin("bitcoin", txs);
				setbtcBalance(btcValueAdded);
				const ethValueAdded = getTransactionsForCoin("ethereum", txs);
				setethBalance(ethValueAdded);
				const usdtValueAdded = getTransactionsForCoin("tether", txs);
				setusdtBalance(usdtValueAdded);
				let val = 0;
				if (userCoins && userCoins.btcPrice && userCoins.btcPrice.quote && userCoins.btcPrice.quote.USD) {

					val = userCoins.btcPrice.quote.USD.price
				} else {
					val = 96075.25
				}
				setliveBtc(val);
				let ethVal = 0;
				if (userCoins && userCoins.ethPrice && userCoins.ethPrice.quote && userCoins.ethPrice.quote.USD) {
					ethVal = userCoins.ethPrice.quote.USD.price
				} else {
					ethVal = 2640
				}
				let lakh = btcValueAdded * val;
				const totalValue = (
					lakh +
					ethValueAdded * ethVal +
					usdtValueAdded
				).toFixed(2);

				const [integerPart, fractionalPart] = totalValue.split(".");

				const formattedTotalValue = parseFloat(integerPart).toLocaleString(
					"en-US",
					{
						style: "currency",
						currency: "USD",
						minimumFractionDigits: 0,
						maximumFractionDigits: 0,
					}
				);

				//
				setfractionBalance(fractionalPart);
				settotalBalance(formattedTotalValue);

				const btcValueAddedPending = sumCoinPendingIncoming(txs, "bitcoin");
				const ethValueAddedPending = sumCoinPendingIncoming(txs, "ethereum");
				const usdtValueAddedPending = sumCoinPendingIncoming(txs, "tether");

				let lakhPending = btcValueAddedPending * val;
				const totalValuePending = (
					lakhPending +
					ethValueAddedPending * ethVal +
					usdtValueAddedPending
				).toFixed(2);

				const [integerPartPending, fractionalPartPending] =
					totalValuePending.split(".");

				const formattedTotalValuePending = parseFloat(
					integerPartPending
				).toLocaleString("en-US", {
					style: "currency",
					currency: "USD",
					minimumFractionDigits: 0,
					maximumFractionDigits: 0,
				});

				//
				setfractionBalancePending(fractionalPartPending);
				settotalBalancePending(formattedTotalValuePending);

				return;
			} else {
				toast.dismiss();
				toast.error(userCoins.msg);
			}
		} catch (error) {
			toast.dismiss();
			toast.error(error);
		} finally {
		}
	};

	const getHtmlData = async () => {
		try {
			const description = await getHtmlDataApi();
			if (description.success) {
				setDescription(description?.description[0]?.description);
				setDescription2(description?.description[1]?.description);

				return;
			} else {
				toast.error(description.msg);
			}
		} catch (error) {
			toast.error(error);
		} finally {
		}
	};

	const fetchLinks = async () => {
		try {
			const data = await getLinksApi();
			if (data?.links && Array.isArray(data.links)) {
				// Check if referral system link (index 9) is enabled
				const referralLink = data.links[9];
				if (referralLink) {
					setReferralLinkEnabled(referralLink.enabled);
				}
			}
		} catch (error) {
			console.error("Error fetching links:", error);
		}
	};
	useEffect(() => {
		if (authUser().user.role === "user") {
			getsignUser()
			getHtmlData()
			fetchLinks()
			setAdmin(authUser().user);
			getCoins(authUser().user);
			patchCoins()
			// Check if referral ad was dismissed
			const adDismissed = localStorage.getItem('referralAdDismissed');
			if (adDismissed === 'true') {
				setShowReferralAd(false);
			}else{
				setShowReferralAd(true);
			}
			return;
		} else if (authUser().user.role === "admin") {
			setAdmin(authUser().user);
			return;
		}
	}, []);

	const dismissReferralAd = () => {
		setShowReferralAd(false);
		localStorage.setItem('referralAdDismissed', 'true');
	};

	const kycStatusState = isUser?._id
		? isUser.kyc === true
			? "verified"
			: isUser.submitDoc?.status === "completed"
			? "pending"
			: isUser.submitDoc?.status === "rejected"
			? "rejected"
			: "unverified"
		: null;

	return (
		<Row>
			<Col xl={12}>
				{/* Unified KYC Verification & Document Signing Status Card */}
				{kycStatusState && (
					<div
						style={{
							marginBottom: 20,
							borderRadius: 18,
							padding: "18px 22px",
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 16,
							background:
								kycStatusState === "verified"
									? "#ecfdf5"
									: kycStatusState === "pending"
									? "#eff6ff"
									: kycStatusState === "rejected"
									? "#fff1f2"
									: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
							border:
								kycStatusState === "verified"
									? "1px solid #a7f3d0"
									: kycStatusState === "pending"
									? "1px solid #bfdbfe"
									: kycStatusState === "rejected"
									? "1px solid #fecdd3"
									: "1px solid #1d4ed8",
							color:
								kycStatusState === "verified"
									? "#065f46"
									: kycStatusState === "pending"
									? "#1e3a8a"
									: kycStatusState === "rejected"
									? "#881337"
									: "#ffffff",
							boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 320px" }}>
							<div
								style={{
									width: 44,
									height: 44,
									borderRadius: 12,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
									background:
										kycStatusState === "verified"
											? "#10b981"
											: kycStatusState === "pending"
											? "#2563eb"
											: kycStatusState === "rejected"
											? "#e11d48"
											: "rgba(255, 255, 255, 0.18)",
									color: "#ffffff",
								}}
							>
								{kycStatusState === "verified" ? (
									<ShieldCheck size={22} />
								) : kycStatusState === "pending" ? (
									<Clock size={22} />
								) : kycStatusState === "rejected" ? (
									<AlertTriangle size={22} />
								) : (
									<Sparkles size={22} />
								)}
							</div>
							<div style={{ minWidth: 0 }}>
								<div
									style={{
										fontSize: 15,
										fontWeight: 800,
										lineHeight: 1.3,
										color: kycStatusState === "unverified" ? "#ffffff" : "inherit",
									}}
								>
									{kycStatusState === "verified"
										? "KYC Identity Verified"
										: kycStatusState === "pending"
										? "KYC Verification Under Compliance Review"
										: kycStatusState === "rejected"
										? "KYC Verification Requires Resubmission"
										: "Complete Your KYC Identity Verification"}
								</div>
								<div
									style={{
										fontSize: 13,
										marginTop: 3,
										opacity: kycStatusState === "unverified" ? 0.92 : 0.85,
										color: kycStatusState === "unverified" ? "#dbeafe" : "inherit",
									}}
								>
									{kycStatusState === "verified"
										? "Your identity and address are approved. Full wallet, KYC, and e-signature access is active."
										: kycStatusState === "pending"
										? "Your Government ID and Proof of Address have been submitted. You can sign pending documents while we review."
										: kycStatusState === "rejected"
										? isUser.submitDoc?.rejectionReason ||
										  "Your previous KYC submission was rejected. Please upload clear, valid documents."
										: "Upload your Government ID and Proof of Address to activate full account compliance."}
								</div>
							</div>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
							<Link
								to="/flows/documents"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									padding: "9px 14px",
									borderRadius: 11,
									fontSize: 12,
									fontWeight: 700,
									textDecoration: "none",
									background:
										kycStatusState === "unverified"
											? "rgba(255, 255, 255, 0.16)"
											: "#ffffff",
									color:
										kycStatusState === "unverified" ? "#ffffff" : "#0f172a",
									border:
										kycStatusState === "unverified"
											? "1px solid rgba(255, 255, 255, 0.28)"
											: "1px solid #e2e8f0",
								}}
							>
								<FileSignature size={14} />
								<span>Document Signing</span>
							</Link>

							<Link
								to="/flows/kyc"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									padding: "9px 16px",
									borderRadius: 11,
									fontSize: 12,
									fontWeight: 700,
									textDecoration: "none",
									background:
										kycStatusState === "unverified"
											? "#ffffff"
											: kycStatusState === "rejected"
											? "#e11d48"
											: kycStatusState === "verified"
											? "#059669"
											: "#2563eb",
									color: kycStatusState === "unverified" ? "#1d4ed8" : "#ffffff",
									boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
								}}
							>
								<span>
									{kycStatusState === "verified"
										? "View KYC Record"
										: kycStatusState === "pending"
										? "View KYC Status"
										: kycStatusState === "rejected"
										? "Resubmit KYC"
										: "Complete KYC Now"}
								</span>
								<ArrowRight size={14} />
							</Link>
						</div>
					</div>
				)}

				<div className="row main-card">
					<MainSlider />
				</div>
				{/* MLM Referral Promo Ad - Dismissible */}
				{showReferralAd && referralLinkEnabled && (
					<Row className="my-2">
						<Col xl={12}>
							<div className="card new-bg-dark" style={{
								background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
								border: '1px solid #1d4ed8',
								position: 'relative',
								overflow: 'hidden'
							}}>
								<button 
									onClick={dismissReferralAd}
									style={{
										position: 'absolute',
										top: '10px',
										right: '10px',
										background: 'rgba(255, 255, 255, 0.2)',
										border: 'none',
										borderRadius: '50%',
										width: '30px',
										height: '30px',
										cursor: 'pointer',
										color: 'white',
										fontSize: '18px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										transition: 'all 0.3s ease',
										zIndex: 10
									}}
									onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.4)'}
									onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
								>
									×
								</button>
								<div className="card-body" style={{ padding: '30px' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
										<div style={{
											background: 'rgba(255, 255, 255, 0.15)',
											borderRadius: '50%',
											width: '80px',
											height: '80px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '40px',
											flexShrink: 0
										}}>
											💰
										</div>
										<div style={{ flex: 1, minWidth: '250px' }}>
											<h3 style={{ 
												color: 'white', 
												fontWeight: '700',
												fontSize: '28px',
												marginBottom: '15px',
												textShadow: '0 2px 4px rgba(0,0,0,0.2)'
											}}>
												Turn Your Friends Into Cash! 🚀
											</h3>
											<p style={{ 
												color: 'rgba(255, 255, 255, 0.95)', 
												fontSize: '16px',
												lineHeight: '1.6',
												marginBottom: '20px'
											}}>
												Turn your friends into crypto buddies and your invites into cash! Share your unique code and get <strong>$100</strong> for every friend who signs up and starts trading. The more you refer, the more you earn — it's that simple. Let's make crypto social — invite, earn, repeat!
											</p>
											<Link 
												to="/user/referral-promo" 
												style={{
													display: 'inline-block',
													background: 'white',
													color: '#667eea',
													padding: '12px 30px',
													borderRadius: '30px',
													fontWeight: '700',
													textDecoration: 'none',
													boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
													transition: 'all 0.3s ease'
												}}
												onMouseEnter={(e) => {
													e.target.style.transform = 'translateY(-2px)';
													e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
												}}
												onMouseLeave={(e) => {
													e.target.style.transform = 'translateY(0)';
													e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
												}}
											>
												Get Your Referral Code Now →
											</Link>
										</div>
									</div>
								</div>
							</div>
						</Col>
					</Row>
				)}
				{
					Description === "" || Description === null || Description === undefined ? "" :
						<Row className="my2 mt-2">
							<Col xl={12}>
								<div className="card new-bg-dark kyc-form-card">
									{/* <div className="card-header text-white">
										<h4 className="card-title text-white">Verify Your Identity for Enhanced Security</h4>
									</div> */}
									<div className="card-body text-white">

										<p
											className="htmData"
											dangerouslySetInnerHTML={{ __html: Description }}
										/>
									</div>
								</div>
							</Col>
						</Row>
				}
				<Row>
					<div className="col-xl-12">
						<DashboardAssetsWallets />
					</div>
					{/* <div className="col-xl-6">
						<div className="card market-chart">
							<div className="card-header border-0 pb-0 flex-wrap">
								<div className="mb-0">
									<h4 className="card-title">Payment Methods</h4> 
								</div>
								<Link to={"/account"} className="btn-link text-primary get-report mb-2">
									
									All Accounts
								</Link>
							</div>
							<MarketOverViewBlog />
						</div>
					</div> */}
				</Row>
				<Col lg={12}>
					<RecentTransaction />
				</Col>
				{
					Description2 === "" || Description2 === null || Description2 === undefined ? "" :
						<Row className="my2 mt-2">
							<Col xl={12}>
								<div className="card new-bg-dark kyc-form-card">
									{/* <div className="card-header text-white">
										<h4 className="card-title text-white">Verify Your Identity for Enhanced Security</h4>
									</div> */}
									<div className="card-body text-white">

										<p
											className="htmData"
											dangerouslySetInnerHTML={{ __html: Description2 }}
										/>
									</div>
								</div>
							</Col>
						</Row>
				}
			</Col>
		</Row >
	)
}

const Home = () => {
	const { changeBackground } = useContext(ThemeContext);
	useEffect(() => {
		changeBackground({ value: "light", label: "Light" });
	}, []);
	return (
		<>
			<MainComponent />
		</>
	)
}

export default Home;