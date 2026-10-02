// Disposable initialization experiment. This is not a browser embedding API.
#include <openrct2/Context.h>
#include <openrct2/Game.h>
#include <openrct2/GameState.h>
#include <openrct2/OpenRCT2.h>
#include <openrct2/PlatformEnvironment.h>
#include <openrct2/audio/AudioContext.h>
#include <openrct2/config/Config.h>
#include <openrct2/localisation/Language.h>
#include <openrct2/scenario/Scenario.h>
#include <openrct2/ui/UiContext.h>
#include <openrct2/world/tile_element/TileElement.h>

#include <filesystem>
#include <iostream>

using namespace OpenRCT2;

static void checkpoint()
{
    const auto& state = getGameState();
    const auto rng = ScenarioRandState();
    std::cout << "{\"checkpoint\":true,\"ticks\":" << state.currentTicks
              << ",\"monthsElapsed\":" << state.date.GetMonthsElapsed()
              << ",\"monthTicks\":" << state.date.GetMonthTicks()
              << ",\"cash\":" << state.park.cash << ",\"loan\":" << state.park.bankLoan
              << ",\"guests\":" << state.park.numGuestsInPark
              << ",\"tileElements\":" << state.tileElements.size()
              << ",\"rng\":[" << rng.s0 << ',' << rng.s1 << "]}\n";
}

int main(int argc, char** argv)
{
    if (argc != 2)
        return 2;

    gOpenRCT2Headless = true;
    gOpenRCT2NoGraphics = true;
    if (!Config::SetDefaults())
        return 3;
    Config::Get().general.language = LANGUAGE_ENGLISH_UK;

    DirBaseValues paths;
    for (size_t i = 0; i < kDirBaseCount; ++i)
    {
        paths[i] = (std::filesystem::path(argv[1]) / ("base-" + std::to_string(i))).string();
        std::filesystem::create_directories(paths[i]);
    }
    auto context = CreateContext(
        CreatePlatformEnvironment(paths), Audio::CreateDummyAudioContext(), Ui::CreateDummyUiContext());
    if (!context->Initialise())
        return 4;

    gLegacyScene = LegacyScene::playing;
    gGamePaused = 0;
    gGameSpeed = 1;
    auto& state = getGameState();
    ScenarioRandSeed(0x1234567F, 0x789FABCD);
    gameStateInitAll(state, TileCoordsXY{5, 5});
    state.park.name = "Independent empty baseline";
    state.scenarioOptions.objective.Type = Scenario::ObjectiveType::none;
    state.park.flags.unset(ParkFlag::parkOpen);
    state.park.flags.unset(ParkFlag::noMoney);
    state.researchFundingLevel = 0;

    checkpoint();
    for (uint32_t i = 0; i < 16384; ++i)
    {
        gameStateUpdateLogic();
        if (state.currentTicks % 4096 == 0)
            checkpoint();
    }
    return state.currentTicks == 16384 && state.date.GetMonthsElapsed() == 1
            && state.date.GetMonthTicks() == 0 && state.park.cash == 9878.00_GBP
            && state.park.bankLoan == 10000.00_GBP && state.park.numGuestsInPark == 0
        ? 0
        : 5;
}
