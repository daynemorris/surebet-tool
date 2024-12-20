// ==UserScript==
// @name         Surebet Tool
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Adds bet size calculation and copy functionality to Surebet rows
// @author       You
// @match        https://en.surebet.com/valuebets
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Create inputs for bankroll and Kelly size
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'fixed';
    controlsDiv.style.top = '10px';
    controlsDiv.style.right = '10px';
    controlsDiv.style.background = '#fff';
    controlsDiv.style.padding = '10px';
    controlsDiv.style.border = '1px solid #ccc';
    controlsDiv.style.zIndex = 10000;

    controlsDiv.innerHTML = `
        <label style="font-weight: bold; color: #000000; font-size: 14px;">
            Bankroll:
            <input type="number" id="bankroll" value="1000" step="1" style="width: 60px;">
        </label>
        <br>
        <label style="font-weight: bold; color: #000000; font-size: 14px;">
            Kelly (%):
            <input type="number" id="kelly" value="15" step="1" style="width: 60px;">
        </label>
        <br>
        <button id="calculate">Calculate Bets</button>
    `;
    document.body.appendChild(controlsDiv);

    // Function to calculate Kelly Criterion bet
    function calculateBet(odds, probability, bankroll, kelly) {
        const preKelly = (((odds - 1) * (probability / 100) - (1 - probability / 100)) / (odds - 1)) * 100;
        const updatedCriteria = preKelly * (kelly / 100);
        const postKelly = (updatedCriteria * bankroll) / 100;

        // Round to the nearest 5
        return Math.round(postKelly / 5) * 5;
    }

    // Function to handle copying specific data to the clipboard
    function handleCopyBet(row) {
        const bookmaker = row.querySelector('.booker a')?.textContent.trim() || "N/A";
        const minorElements = row.querySelectorAll('.booker .minor');
        const sport = minorElements.length > 0 ? minorElements[minorElements.length - 1].textContent.trim() : "N/A";
        const event = row.querySelector('.event a')?.textContent.split(' – ')[0].trim() || "N/A";
        const league = row.querySelector('.event .minor')?.textContent.trim() || "N/A";
        const timeRaw = row.querySelector('.time abbr')?.textContent.trim() || "N/A";
        const time = timeRaw.replace(/(\d{2}\/\d{2})(\d{2}:\d{2})/, "$1 $2");
        const market = row.querySelector('.coeff')?.textContent.trim().replace(/\s+/g, ' ') || "N/A";
        const odds = parseFloat(row.querySelector('.value_link')?.textContent.trim() || "N/A");
        const probability = parseFloat(row.querySelector('.text-center a')?.textContent.trim() || "N/A");

        // Extract overvalue without dynamically added "Bet: $XX" text
        const overvalue = row.querySelector('.overvalue')?.childNodes[0]?.textContent.trim() || "N/A";

        const bankroll = parseFloat(document.getElementById('bankroll').value);
        const kelly = parseFloat(document.getElementById('kelly').value);
        const betAmount = isNaN(odds) || isNaN(probability) ? "N/A" : `$${calculateBet(odds, probability, bankroll, kelly)}`;

        const formattedData = `${bookmaker}, ${sport}, ${event}, ${league}, ${time}, ${market}, ${odds}, ${probability}%, ${overvalue}, ${betAmount}`;

        navigator.clipboard.writeText(formattedData).then(() => {
            console.log('Copied to clipboard:', formattedData);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }

    // Function to add "Copy Bet" buttons and integrate calculation results
    function addCopyButtons() {
        document.querySelectorAll('.valuebet_record').forEach(row => {
            if (row.querySelector('.copy-bet-button')) return;

            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy Bet';
            copyButton.className = 'copy-bet-button';
            copyButton.style.cssText = `
                margin-left: 10px;
                padding: 5px 10px;
                background-color: #007bff;
                color: #fff;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            `;

            copyButton.addEventListener('click', (e) => {
                handleCopyBet(row);
                
                // Visual feedback
                copyButton.style.backgroundColor = '#28a745';
                copyButton.textContent = 'Copied!';
                
                // Create ripple effect
                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position: absolute;
                    background: rgba(255, 255, 255, 0.7);
                    width: 100%;
                    height: 100%;
                    left: 0;
                    top: 0;
                    opacity: 1;
                    pointer-events: none;
                    animation: ripple 0.6s ease-out;
                `;
                
                copyButton.appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => ripple.remove(), 600);
                
                // Reset button after delay
                setTimeout(() => {
                    copyButton.style.backgroundColor = '#007bff';
                    copyButton.textContent = 'Copy Bet';
                }, 1500);

                // Find and click the hide button after copying
                const hideButton = row.querySelector('.dropdown-item[title="Hide this valuebet"]');
                if (hideButton) {
                    setTimeout(() => {
                        hideButton.click();
                    }, 500); // Half second delay before hiding
                }
            });

            const lastCell = row.querySelector('td:last-child');
            if (lastCell) {
                lastCell.appendChild(copyButton);
            } else {
                const newCell = document.createElement('td');
                newCell.appendChild(copyButton);
                row.appendChild(newCell);
            }
        });
    }

    document.getElementById('calculate').addEventListener('click', () => {
        const bankroll = parseFloat(document.getElementById('bankroll').value);
        const kelly = parseFloat(document.getElementById('kelly').value);

        document.querySelectorAll('.valuebet_record').forEach(row => {
            const odds = parseFloat(row.querySelector('.value_link')?.textContent.trim());
            const probability = parseFloat(row.querySelector('.text-center a')?.textContent.trim());

            if (isNaN(odds) || isNaN(probability)) return;

            const betAmount = calculateBet(odds, probability, bankroll, kelly);

            const overvalueCell = row.querySelector('.overvalue');
            let betAmountSpan = overvalueCell.querySelector('.bet-amount');
            if (!betAmountSpan) {
                betAmountSpan = document.createElement('span');
                betAmountSpan.className = 'bet-amount';
                betAmountSpan.style.marginLeft = '50px';
                betAmountSpan.style.color = '#28a745';
                betAmountSpan.style.fontWeight = 'bold';
                overvalueCell.appendChild(betAmountSpan);
            }

            betAmountSpan.textContent = `Bet: $${betAmount}`;
        });
    });

    addCopyButtons();

    const observer = new MutationObserver(() => {
        addCopyButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Add CSS animation to document
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            from {
                transform: scale(0);
                opacity: 1;
            }
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .copy-bet-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        .copy-bet-button:active {
            transform: translateY(0);
            box-shadow: none;
        }
    `;
    document.head.appendChild(style);
})();
